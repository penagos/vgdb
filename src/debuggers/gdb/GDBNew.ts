import path = require("path");
import { Breakpoint } from "vscode-debugadapter";
import { Debugger, DebuggerVariable } from "../Debugger";
import { EVENT_BREAKPOINT_HIT, EVENT_END_STEPPING_RANGE, EVENT_EXITED_NORMALLY, EVENT_FUNCTION_FINISHED, EVENT_RUNNING, EVENT_SIGNAL, EVENT_SOLIB_ADD, EVENT_SOLIB_LOADED, EVENT_THREAD_NEW } from "./GDB";
import { AsyncRecord, AsyncRecordType } from "./parser/AsyncRecord";
import { MIParser, RUNNING, STOPPED } from "./parser/MIParser";
import { OutputRecord } from "./parser/OutputRecord";
import { ResultRecord } from "./parser/ResultRecord";
import { StreamRecord } from "./parser/StreamRecord";

export class GDBNew extends Debugger { 
    // Default path to MI debugger. If none is specified in the launch config
    // we will fallback to this path
    protected debuggerPath = 'gdb';
    
    // Arguments to pass to GDB. These will be combined with any that need to
    //  threaded to the inferior process
    private debuggerLaunchArguments = [
        '--interpreter=mi',
        '-q',
        '--tty=`tty`'
    ];

    // This instance will handle all MI output parsing
    private parser: MIParser = new MIParser();

    // Used to sync MI inputs and outputs. Value increases by 1 with each
    // command issued
    private token: number = 0;

    // Output buffering for stdout pipe
    private outputBuffer: string = '';

    // Libraries for which debugger has loaded debug symbols for
    private loadedLibraries = new Map<string, boolean>();

    // Callbacks to execute when a command identified by "token" is resolved
    // by the debugger
    private handlers: {[token: number]: (record: OutputRecord) => any} = [];

    private breakpoints = new Map<string, number[]>();

    // Mapping of symbolic variable names to GDB variable references
    private variables = new Map<number, DebuggerVariable>();

    public spawnDebugger(): Promise<any> {
        throw new Error("Method not implemented.");
    }
    
    protected handleInferiorOutput(data: any): void {
        let record: OutputRecord | null;
        this.outputBuffer += data.toString('utf8');
        
        // We may be receiving buffered output. In such case defer parsing until
        // full output has been transmitted as denoted by a trailing newline
        const nPos = this.outputBuffer.lastIndexOf('\n');

        if (nPos !== -1) {
            // If multiple lines have buffered, handle each one
            const lines = this.outputBuffer.substr(0, nPos).split('\n') as string[];
            
            // Flush output buffer for next round of output
            this.outputBuffer = this.outputBuffer.substring(nPos + 1);
            
            lines.forEach(line => {
                try {
                    if ((record = this.parser.parse(line))) {
                        this.handleParsedResult(record);
                    }
                        
                        /*
                        // Minimize the amount of logging
                        if (
                            record.constructor === StreamRecord ||
                            this.debug === DebugLoggingLevel.VERBOSE
                            ) {
                                this.emit(
                                    EVENT_OUTPUT,
                                    this.sanitize(record.prettyPrint(), true)
                                    );
                                }
                            }*/
                } catch (error: any) {
                    //this.emit(EVENT_ERROR_FATAL);
                }
            });
        }
    }

    private handleParsedResult(record: OutputRecord) {
        switch (record.constructor) {
            case AsyncRecord:
                this.handleAsyncRecord(record as AsyncRecord);
            break;

            case ResultRecord:
                this.handleResultRecord(record as ResultRecord);
            break;

            case StreamRecord:
                this.handleStreamRecord(record as StreamRecord);
            break;
        }
    }

    private handleStreamRecord(record: StreamRecord) {
        // Forward raw GDB output to debug console
    }

    private handleResultRecord(record: ResultRecord) {
        if (!isNaN(record.getToken())) {
            const handler = this.handlers[record.getToken()];
  
            if (handler) {
                handler(record);
                delete this.handlers[record.getToken()];
            } else {
                // There could be instances where we should fire DAP
                // events even if the request did not originally contain
                // a handler. For example, up/down should correctly move
                // the active stack frame in VSCode
            }
        }
    }

    private handleAsyncRecord(record: AsyncRecord) {
        const handleStatus = () => {
            // TODO
        };

        const handleNotify = () => {
            // Listen for thread events
            switch (record.getClass()) {
                case EVENT_THREAD_NEW:
                    this.emit(EVENT_THREAD_NEW, record.getResult('id'));
                break;

                case EVENT_SOLIB_LOADED:
                    // If deferred symbol loading is enabled, check that the
                    // shared library loaded is in the user specified list.
                    const libLoaded = path.basename(record.getResult('id'));
                    if (this.sharedLibraries.indexOf(libLoaded) > -1) {
                        this.loadedLibraries.set(libLoaded, true);
                    }
                break;
            }
        };

        const handleExec = () => {
            switch (record.getClass()) {
                case STOPPED:
                    const stoppedReason = record.getResult('reason');
                    this.threadID = parseInt(record.getResult('thread-id'));

                    switch (stoppedReason) {
                        case EVENT_BREAKPOINT_HIT:
                        case EVENT_END_STEPPING_RANGE:
                        case EVENT_FUNCTION_FINISHED:
                            // These events don't necessitate any special changes
                            // on the debugger itself. Simply bubble up the event
                            // to the debug session.
                            this.emit(stoppedReason, this.threadID);
                        break;

                        case EVENT_EXITED_NORMALLY:
                            // The inferior has finished execution. Take down the
                            // debugger and inform the debug session that there
                            // is nothing else to debug.
                            this.sendCommand('quit');
                            this.emit(EVENT_EXITED_NORMALLY);
                        break;

                        case EVENT_SIGNAL:
                            // TODO
                        break;

                        case EVENT_SOLIB_ADD:
                            // This event will only be hit if the user has
                            // explicitly specified a set of shared libraries
                            // for deferred symbol loading so we need not check
                            // for the presence of such setting
                            this.sharedLibraries.forEach((library: string) => {
                                if (this.loadedLibraries.get(library)) {
                                    this.sendCommand(`sharedlibrary ${library}`);
                                }
                            });

                            this.continue();
                        break;

                        default:
                            throw new Error('Unknown stop reason');
                    }
                break;
  
                case RUNNING:
                    // When the inferior resumes execution, remove all tracked
                    // variables which were used to service variable reference IDs
                    this.threadID = -1;

                    this.clearDebuggerVariables().then(() => {
                        this.emit(EVENT_RUNNING, this.threadID, isNaN(this.threadID));
                    });
                break;
              }
        };

        // Notify GDB client of status change
        switch (record.getType()) {
            case AsyncRecordType.EXEC:
                handleExec();
            break;
  
            case AsyncRecordType.NOTIFY:
                handleNotify();
            break;
  
            case AsyncRecordType.STATUS:
                handleStatus();    
            break;
        }
    }

    public launchInferior(): Promise<any> {
        return new Promise((resolve, reject) => {
            this.sendCommand('-gdb-set target-async on').then(() => {
                this.sendCommand('-exec-run').then(() => {
                    resolve(true);
                });
            });
        });
    }
    
    public attachInferior(): Promise<any> {
        throw new Error("Method not implemented.");
    }
    
    public clearBreakpoints(fileName: string): Promise<any> {
        throw new Error("Method not implemented.");
    }
    
    public continue(threadID?: number): Promise<any> {
        throw new Error("Method not implemented.");
    }
    
    public getStackTrace(threadID: number): Promise<any> {
        throw new Error("Method not implemented.");
    }
    
    public getCommandCompletions(command: number): Promise<any> {
        throw new Error("Method not implemented.");
    }
    
    public getDisassembly(memoryAddress: string): Promise<any> {
        throw new Error("Method not implemented.");
    }
    
    public getThreads(): Promise<any> {
        throw new Error("Method not implemented.");
    }
    
    public getVariables(referenceID: number): Promise<any> {
        throw new Error("Method not implemented.");
    }
    
    public next(threadID: number, granularity: string): Promise<any> {
        throw new Error("Method not implemented.");
    }
    
    public pause(threadID: number): Promise<any> {
        throw new Error("Method not implemented.");
    }
    
    public sendCommand(command: string): Promise<any> {
        console.log(command);
        
        return new Promise((resolve, reject) => {
            command = `${(++this.token) + command}\n`;
            this.inferiorInputHandle.write(command);
            this.handlers[this.token] = (record: OutputRecord) => {
                this.log(record.prettyPrint());
                resolve(record);
            };
        });
    }
    
    public sendUserCommand(command: string): Promise<any> {
        throw new Error("Method not implemented.");
    }
    
    public setBreakpoints(fileName: string, breakpoints: any[]): Promise<any> {
        return new Promise((resolve, reject) => {
            // If this is the first time setting a breakpoit in this file, initialize
            // our breakpoints array to countain no previously requested breakpoints
            if (!this.breakpoints.has(fileName)) {
                this.breakpoints.set(fileName, []);
            }
            
            fileName = this.getNormalizedFileName(fileName);
            const breakpointsPending: Promise<any>[] = [];
            const breakpointsConfirmed: Breakpoint[] = [];
            
            // Send each breakpoint to GDB. As GDB replies with acknowledgements of
            // the breakpoint being set, if the breakpoint has been bound to a source
            // location, mark the breakpoint as being verified. Further, irregardless
            // of whether or not a breakpoint has been bound to source, modify break
            // conditions if/when applicable
            breakpoints.forEach(breakpoint => {
                const breakpointCommand = `-break-insert -f ${fileName}:${breakpoint.line}`;
                breakpointsPending.push(this.sendCommand(breakpointCommand).then(() => {
                    // TODO hook up actual verified state
                    breakpointsConfirmed.push(new Breakpoint(true, 1));
                }));
            });
            
            Promise.all(breakpointsPending).then(brkpoints => {
                // Only return breakpoints GDB has actually bound to a source. Others
                // will be marked verified as the debugger binds them later on
                resolve(breakpointsConfirmed);
            });
        });
    }
    
    public stepIn(threadID: number): Promise<any> {
        throw new Error("Method not implemented.");
    }
    
    public stepOut(threadID: number): Promise<any> {
        throw new Error("Method not implemented.");
    }
    
    public startInferior(): Promise<any> {
        throw new Error("Method not implemented.");
    }
    
    public terminate(): Promise<any> {
        throw new Error("Method not implemented.");
    }
    
    protected createDebuggerLaunchCommand(): string {
        // This idea is borrowed from the Microsoft cpptools VSCode extension.
        // It really is the only conceivable way to support running in the
        // integrated terminal. We spin on the GDB process to prevent the shell
        // from accepting normal commands. We set a trap handler to correctly
        // communicate inferior completion back to the debug adapter so we can
        // issue the corresponding TerminatedEvent and take down GDB. We issue
        // the +m command to hide the background "done" message when GDB
        // finishes debugging the inferior. These hacks probably won't work on Windows
        
        // Append any user specified arguments to the inferior
        if (typeof this.inferiorProgram === 'string') {
            if (this.userSpecifiedDebuggerArguments) {
                this.debuggerLaunchArguments.push('--args');
                this.debuggerLaunchArguments.push(this.inferiorProgram);
                this.debuggerLaunchArguments = this.debuggerLaunchArguments.concat(this.userSpecifiedDebuggerArguments);
            } else {
                this.debuggerLaunchArguments.push(this.inferiorProgram);
                this.debuggerLaunchArguments = this.debuggerLaunchArguments.reverse();
            }
        }
        
        return `bash -c "${this.createEnvironmentVariablesSetterCommand()} trap '' 2 ; ${this.debuggerPath} ${this.debuggerLaunchArguments.join(' ')} < ${this.inferiorInputFileName} > ${this.inferiorOutputFileName} & clear ; pid=$!; set +m ; wait $pid ; trap 2 ; echo ;"`;
    }
    
    protected handlePostDebuggerStartup(): Promise<any> {
        return new Promise((resolve, reject) => {
            resolve(true);
        });
    }
    
    private createEnvironmentVariablesSetterCommand(): string {
        let bashCommand = '';
        
        Object.keys(this.environmentVariables).forEach((key: string) => {
            const value = this.environmentVariables[key];
            bashCommand = bashCommand.concat(`export ${key}=${value};`, bashCommand);
        });
        
        return bashCommand;
    }

    private clearDebuggerVariables(): Promise<boolean> {
        return new Promise((resolve, reject) => {
            if (this.variables.size) {
                this.sendCommand('-var-delete').then(() => {
                    this.variables.clear();
                    resolve(true);
                });
            } else {
                resolve(true);
            }
        });
    }
}