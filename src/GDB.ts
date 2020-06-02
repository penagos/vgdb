import { MIParser, STOPPED, RUNNING, ERROR } from "./parser/MIParser";
import { EventEmitter } from "events";
import { Record } from "./parser/Record";
import { AsyncRecord, AsyncRecordType } from "./parser/AsyncRecord";
import { ResultRecord } from "./parser/ResultRecord";
import { StreamRecord } from "./parser/StreamRecord";
import { Breakpoint, Thread, StackFrame, Source } from "vscode-debugadapter";
import { OutputChannel } from "vscode";
import * as vscode from "vscode";
import * as fs from 'fs';
import * as ts from 'tail-stream';

// GDB stop reasons
export const EVENT_OUTPUT = "output";
export const EVENT_RUNNING = "running";
export const EVENT_BREAKPOINT_HIT = "breakpoint-hit";
export const EVENT_END_STEPPING_RANGE = "end-stepping-range";
export const EVENT_FUNCTION_FINISHED = "function-finished";
export const EVENT_EXITED_NORMALLY = "exited-normally";
export const EVENT_SIGNAL = "signal-received";
export const EVENT_PAUSED = "paused";
export const EVENT_ERROR = "error";
export const EVENT_ERROR_FATAL = "error-fatal";

export const SCOPE_LOCAL = 1;

export class GDB extends EventEmitter {
    // Default path to MI debugger. If none is specified in the launch config
    // we will fallback to this path
    private path: string = "gdb";

    // Arguments to pass to GDB. These will be combined with any that need to
    // be threaded to the inferior process
    private args: string[] = ['--interpreter=mi2', '-q', '--tty=`tty`'];

    // This instance will handle all MI output parsing
    private parser: MIParser;

    // Used to sync MI inputs and outputs. Value increases by 1 with each
    // command issued
    private token: number;

    // Callbacks to execute when a command identified by "token" is resolved
    // by the debugger
    private handlers: { [token: number]: (record: Record) => any };

    // The current thread on which the debugger is stopped on. If the debugger
    // is not currently stopped on any thread, this value is -1. Also serves
    // as a stopped sentinel
    private threadID: number;

    private outputChannel: OutputChannel;
    private outputTerminal: vscode.Terminal;

    // Control whether or not to dump extension diagnostic information to a
    // dedicated output channel (useful for development)
    private debug: boolean = true;

    // Filepaths to input and output pipes used for IPC with GDB process. These
    // will be randomly generated on each debug session
    private inputFile: string;
    private outputFile: string;

    // IO handles to actual pipes. The input handle is an actual FIFO handle
    // while the output handle is a normal fd
    private inputHandle;
    private outputHandle;

    // Output buffering for stdout pipe
    private ob: string;

    // Inferior PID for attach requests
    private PID: number;

    public constructor(outputChannel: OutputChannel) {
        super();

        this.outputChannel = outputChannel;
        this.token = 0;
        this.threadID = 0;
        this.ob = "";
        this.handlers = [];
        this.parser = new MIParser();

        // This is a bit of a hack -- since there is no elegant way of making a
        // FIFO pipe in nodeJS we need to resort to a shell to do so. We need to
        // do this in the constructor to give sufficient time for the FIFO pipe
        // creation prior to writing to it
        this.createIOPipes();
    }

    private createIOPipes() {
        this.inputFile = this.generateTmpFile('In') + this.token;
        this.outputFile = this.generateTmpFile('Out') + this.token;
        let cmd = `mkfifo ${this.inputFile} ;`;
        const { exec } = require('child_process');
        exec(cmd);
    }

    private log(text: string) {
        if (this.debug) {
            this.outputChannel.appendLine(text);
        }
    }

    private genRandomID(length: number) : string {
        var result           = '';
        var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        var charactersLength = characters.length;
        for ( var i = 0; i < length; i++ ) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        return result;
    }

    private generateTmpFile(desc: string) : string {
        return `/tmp/vGDB_${desc}${this.genRandomID(8)}`;
    }

    private createLaunchCommand(debuggerPath: string,
                                program: any,
                                args) : string {
        // This idea is borrowed from the Microsoft cpptools VSCode extension.
        // It really is the only conceivable way to support running in the
        // integrated terminal. We spin on the GDB process to prevent the shell
        // from accepting normal commands. We set a trap handler to correctly
        // communicate inferior completion back to the debug adapter so we can
        // issue the corresponding TerminatedEvent and take down GDB. We issue
        // the +m command to hide the background "done" message when GDB
        // finishes debugging the inferior
        // All of these hacks probably won't work on Windows
        fs.writeFile(this.outputFile, '', () => {});

        let cleanup = `& clear ; pid=$!; set +m ; trap 'echo "quit" > ${this.inputFile}' SIGINT ; wait $pid`;
        return `${this.path} ${this.args.join(' ')} < ${this.inputFile} > ${this.outputFile} ${cleanup}`;
    }

    public spawn(debuggerPath: string,
                 program: any,
                 args: ([] | undefined)): Promise<any> {
        return new Promise((resolve, reject) => {
            // We need to spawn a new terminal & run a tty command to setup the
            // proper pipe from the inferior's stdout/stderr to such terminal
            // In order to get the results of the tty command we need to
            // temporarily redirect the output to a known file
            this.outputTerminal = vscode.window.createTerminal(`vGDB`);

            // Spawn the GDB process in the integrated terminal. In order to
            // correctly separate inferior output from GDB output and pipe
            // them to the correct handlers we use some hacks:
            // (1) We set the inferior-tty to be that of the integrated terminal
            //     This lets us pipe all stdout/stderr from the inferior there
            //     and separate it from any output created by GDB. It also lets
            //     us use the integrated terminal for the inferior's input
            // (2) We redirect all GDB stdout to a tmp file which the debug
            //     adapter will monitor for command results and other async
            //     notify events
            // (3) We redirect all stdin to GDB through another FIFO pipe which
            //     we will keep open throughout the entirety of the debug
            //     session (to prevent premature debugger exit).
            if (debuggerPath !== undefined) {
                this.path = debuggerPath;
            }

            // If this is an attach request, the program arg will be a numeric
            // We need to thread this differently to GDB
            if (isNaN(program)) {
                if (args) {
                    this.args.push('--args');
                    this.args.push(program);
                    this.args = this.args.concat(args);
                } else {
                    this.args.push(program);
                }
            } else {
                this.PID = program;
            }

            let launchCmd = this.createLaunchCommand(debuggerPath, program, args);
            this.log(launchCmd);
            this.outputTerminal.sendText(launchCmd);
            this.outputTerminal.show(true);
            this.inputHandle =  fs.createWriteStream(this.inputFile, {flags: 'a'});
            this.outputHandle = ts.createReadStream(this.outputFile);

            this.outputHandle.on('data', (data) => {
                this.stdoutHandler(data);
            });

            this.inputHandle.on('open', () => {
                resolve();
            });
        });
    }

    // Send an MI command to GDB
    public sendCommand(cmd: string): Promise<any> {
        return new Promise((resolve, reject) => {
            const token = ++this.token;
            cmd = token + cmd;
            this.log(cmd);
            this.inputHandle.write(cmd + '\n');

            this.handlers[token] = (record: Record) => {
                this.log(record.prettyPrint());
				resolve(record);
			};
        });
    }

    // Called on any stdout produced by GDB Process
    private stdoutHandler(data) {
        let record:(Record | null);
        let str = data.toString('utf8');
        this.ob += str;

        // We may be receiving buffered output. In such case defer parser until
        // full output has been transmitted as denoted by \n
        let nPos = this.ob.lastIndexOf('\n')
        if (nPos != -1) {
            this.ob = this.ob.substr(0, nPos);

            // If multiple lines have buffered, handle each one
            let lines = this.ob.substr(0, nPos).split('\n') as string[];

            // Flush output buffer for next round of output
            this.ob = this.ob.substring(nPos + 1);

            for (let line of lines) {
                try {
                    if (record = this.parser.parse(line)) {
                        this.handleParsedResult(record);
 
                        // Minimize the amount of logging
                        if (record.constructor == StreamRecord) {
                            this.emit(EVENT_OUTPUT, record.prettyPrint());
                        }
                    }
                } catch(error) {
                    // Relay error state to debug session
                    console.error(error.stack);
                    this.emit(EVENT_ERROR_FATAL);
                }
            }
        }
    }

    private handleParsedResult(record: Record) {
        switch (record.constructor) {
            case AsyncRecord:
                // Notify GDB client of status change
                switch (record.getType()) {
                    case AsyncRecordType.EXEC:
                        switch (record.getClass()) {
                            case STOPPED:
                                this.threadID = parseInt(record.getResult("thread-id"));
                                let reason = record.getResult("reason");

                                // Play nice with attach requests
                                if (reason !== undefined) {
                                    switch (reason) {
                                        case EVENT_BREAKPOINT_HIT:
                                            this.emit(reason, this.threadID);
                                        break;

                                        case EVENT_END_STEPPING_RANGE:
                                            this.emit(reason, this.threadID);
                                        break;

                                        case EVENT_FUNCTION_FINISHED:
                                            this.emit(EVENT_FUNCTION_FINISHED, this.threadID);
                                        break;

                                        case EVENT_EXITED_NORMALLY:
                                            // Kill debugger
                                            this.sendCommand(`quit`);
                                            this.emit(reason)
                                        break;

                                        case EVENT_SIGNAL:
                                            this.emit(reason, this.threadID);
                                        break;

                                        default:
                                            throw new Error("unknown stop reason: " + reason);
                                    }
                                }
                            break;

                            case RUNNING:
                                let tid:number, all: boolean;
                                this.threadID = -1;
                                all = false;

                                // If threadID is not a number, this means all threads have continued
                                tid = parseInt(record.getResult("thread-id"));
                                if (tid == NaN) {
                                    tid = this.threadID;
                                    all = true;
                                }

                                // For now we assume all threads resume execution
                                this.emit(EVENT_RUNNING, this.threadID, all);
                            break;
                        }
                    break;

                    case AsyncRecordType.NOTIFY:
                    
                    break;

                    case AsyncRecordType.STATUS:

                    break;
                }
            break;

            case ResultRecord:
                // Fulfill promise on stack
                if (record.getToken() !== NaN) {
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
            break;

            case StreamRecord:
                // Forward raw GDB output to debug console
            break;
        }
    }

    public clearBreakpoints(): Promise<any>  {
        return this.sendCommand(`-break-delete`);
    }

    public setBreakpoints(sourceFile: string, bps): Promise<Breakpoint[]>  {
        return new Promise((resolve, reject) => {
            // Under the hood dispatch to sendCommand for each breakpoint and
            // only fulfill greater request once all sets have been fulfilled
            // by GDB
            let bpsPending: Promise<any>[] = [];
            let bpsVerified: Breakpoint[] = [];

            if (bps) {
                bps.forEach((bp) => {
                    // TODO: move -f flag to setting. We only need this for targets that rely
                    // on shared libraries which are not immediately loaded on inferior start
                    let promise = this.sendCommand(`-break-insert -f ${sourceFile}:${bp.line}`);
                    bpsPending.push(promise);
                    promise.then((record: ResultRecord) => {
                        // If this is a conditional breakpoint we must relay the
                        // expression to GDB and update the breakpoint
                        let bpInfo = record.getResult("bkpt");

                        // Update promise
                        if (bp.condition) {
                            promise = this.sendCommand(`-break-condition ${bpInfo.number} ${bp.condition}`);
                            promise.then((record: ResultRecord) => {
                                let verifiedBp = new Breakpoint(true, bpInfo.line);
                                bpsVerified.push(verifiedBp);
                            });
                        } else {
                            let verifiedBp = new Breakpoint(true, bpInfo.line);
                            bpsVerified.push(verifiedBp);
                        }
                    });
                });

                Promise.all(bpsPending).then(brkpoints => {
                    resolve(bpsVerified);
                });
            } else {
                // No breakpoints to verify
                resolve([]);
            }
        });
    }

    public startInferior(): Promise<any> {
        // Launch the debuggee target -- we need to do some magic here to hide
        // the longstanding GDB bug when redirecting inferior output to a
        // different tty. So we clear the active terminal and continue on our
        // merry way.
        return new Promise((resolve, reject) => {
            this.sendCommand(`-gdb-set target-async on`).then(() => {
                return this.sendCommand(`-exec-run`).then(() => {
                    return vscode.commands.executeCommand('workbench.action.terminal.clear');
                });
            });
        });
    }

    public attachInferior(): Promise<any> {
        // Only for attach requests
        return new Promise((resolve, reject) => {
            this.sendCommand(`-gdb-set target-async on`).then(() => {
                this.sendCommand(`attach ${this.PID}`).then(() => {
                    return this.sendCommand(`-exec-continue`);
                });
            });
        });
    }

    public evaluateExpr(expr: string, frameID?: number): Promise<any> {
        return new Promise((resolve, reject) => {
            let cmd = `-data-evaluate-expression`;

            if (frameID) {
                // "normalize" frameID with threadID
                frameID = frameID - this.threadID + 1;
                cmd += ` --frame ${frameID} --thread ${this.threadID}`;
            }

            cmd += ` "${expr}"`;

            this.sendCommand(cmd).then((record: ResultRecord) => {
                resolve(record.getResult("value"));
            });
        });
    }

    // This is a little different than the evaluate expr fcn as the expr to be
    // evaluated may be composed of various calls and other gdb commands, so
    // we pipe it as if the user would have typed it at the CL
    public execUserCmd(expr: string, frameID?: number): Promise<any> {
        return new Promise((resolve, reject) => {
            let cmd = `-interpreter-exec`;

            if (frameID) {
                // "normalize" frameID with threadID
                frameID = frameID - this.threadID + 1;
                cmd += ` --frame ${frameID} --thread ${this.threadID}`;
            }

            cmd += ` console "${expr}"`;

            this.sendCommand(cmd).then((record: ResultRecord) => {
                // If an error has resulted, also send an error event to show it to the user
                if (record.getClass() == ERROR) {
                    this.emit(EVENT_ERROR, record.getResult("msg").replace(/\\/g, ''));
                }

                resolve(record.getResult("value"));
            });

            // If this was an up or down command, send a continued and paused
            // event to trick VSCode into re-requesting the stacktrace.
            // TODO: this will not cause the right stackframe to be selected as
            // the debug adapter protocol does not support this
            if (expr == "up" || expr == "down") {
                this.emit(EVENT_RUNNING, this.threadID, true);
                this.emit(EVENT_PAUSED);
            }
        });
    }

    public getThreads(): Promise<any> {
        return new Promise((resolve, reject) => {
            this.sendCommand(`-thread-info`).then((record: ResultRecord) => {
                let threads = record.getResult("threads");
                let threadsResult: Thread[] = [];

                threads.forEach(thread => {
                    threadsResult.push(new Thread(parseInt(thread.id), thread.name));
                });

                resolve(threadsResult);
            });
        });
    }

    public isStopped(): boolean {
        return this.threadID != -1;
    }

    public getStack(threadID: number): Promise<any> {
        return new Promise((resolve, reject) => {
            this.sendCommand(`-stack-list-frames --thread ${threadID}`).then((record: ResultRecord) => {
                let stack = record.getResult("stack");
                let stackFinal: StackFrame[] = [];
                let name, src;

                stack.forEach(frame => {
                    frame = frame[1];
                    name = frame.func + '@' + frame.addr;
                    src = new Source(frame.file, frame.fullname);
                    stackFinal.push(new StackFrame(threadID + parseInt(frame.level), name, src, parseInt(frame.line)));
                });

                resolve(stackFinal);
            });
        });
    }

    public getVars(reference: number): Promise<any> {
        return new Promise((resolve, reject) => {
            switch (reference) {
                case SCOPE_LOCAL:
                    this.sendCommand(`-stack-list-variables --all-values`).then((record: Record) => {
                        resolve(record.getResult("variables"));
                    });
                break;

                default:
                    throw new Error(`Unknown variable reference ${reference}`);
            }
        });
    }

    public next(threadID: number): Promise<any> {
        return this.sendCommand(`-exec-next --thread ${threadID}`);
    }

    public continue(threadID?: number): Promise<any> {
        if (threadID) {
            return this.sendCommand(`-exec-continue --thread ${threadID}`);
        } else {
            return this.sendCommand(`-exec-continue`);
        }
    }

    public stepIn(threadID: number): Promise<any> {
        return this.sendCommand(`-exec-step --thread ${threadID}`);
    }

    public stepOut(threadID: number): Promise<any> {
        return this.sendCommand(`-exec-finish --thread ${threadID}`);
    }

    public pause(threadID?: number): Promise<any> {
        let tid = threadID !== undefined ? `--thread ${threadID}` : ``;
        return this.sendCommand(`-exec-interrupt ${tid}`);
    }
}