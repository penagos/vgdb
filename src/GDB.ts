import { MIParser, STOPPED, RUNNING, ERROR } from "./parser/MIParser";
import { EventEmitter } from "events";
import { Record } from "./parser/Record";
import { AsyncRecord, AsyncRecordType } from "./parser/AsyncRecord";
import { ResultRecord } from "./parser/ResultRecord";
import { StreamRecord } from "./parser/StreamRecord";
import { Breakpoint, Thread, StackFrame, Source } from "vscode-debugadapter";
import { OutputChannel, Terminal } from "vscode";
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
export const EVENT_THREAD_NEW = "thread-created";

export const SCOPE_LOCAL = 1000;

export class GDB extends EventEmitter {
    // Default path to MI debugger. If none is specified in the launch config
    // we will fallback to this path
    private path: string = "gdb";

    // Arguments to pass to GDB. These will be combined with any that need to
    // be threaded to the inferior process
    private args: string[] = ['--interpreter=mi', '-q', '--tty=`tty`'];

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
    private outputTerminal: Terminal;

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
    public PID: number = 0;

    // Should we emit a stopped event on a pause?
    private handleSIGINT: boolean = true;

    public constructor(outputChannel: OutputChannel, terminal: Terminal) {
        super();

        this.outputChannel = outputChannel;
        this.token = 0;
        this.threadID = 0;
        this.ob = "";
        this.handlers = [];
        this.parser = new MIParser();

        // We need to spawn a new terminal & run a tty command to setup the
        // proper pipe from the inferior's stdout/stderr to such terminal
        // In order to get the results of the tty command we need to
        // temporarily redirect the output to a known file
        this.outputTerminal = terminal;

        // If there was a prior launch that used the same output terminal we
        // need to clear prior output
        this.outputTerminal.sendText(`clear`);

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

        // We cannot simply send all commands to the terminal and assume the
        // user's default shell is bash. Instead we will wrap all cmds in a
        // string and explicitly invoke the bash shell
        return `trap '' 2 ; ${this.path} ${this.args.join(' ')} < ${this.inputFile} > ${this.outputFile} & clear ; pid=$!; set +m ; wait $pid ; trap 2 ; echo ;`;
    }

    public spawn(debuggerPath: string,
                 envVars: Object,
                 cmds: ([] | undefined),
                 program: any,
                 args: ([] | undefined)): Promise<any> {
        return new Promise((resolve, reject) => {
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

            // Send any env vars
            const envVarsSetupCmd = this.createEnvVarsCmd(envVars);

            if (envVarsSetupCmd != "") {
                this.outputTerminal.sendText(envVarsSetupCmd);
            }

            this.outputTerminal.sendText(`bash -c "${launchCmd}"`);
            this.outputTerminal.show(true);
            this.inputHandle =  fs.createWriteStream(this.inputFile, {flags: 'a'});
            this.outputHandle = ts.createReadStream(this.outputFile);

            this.outputHandle.on('data', (data) => {
                this.stdoutHandler(data);
            });

            // Only consider GDB as ready once pipe is ready. Once ready send all setup
            // cmds to GDB and then resolve promise
            this.inputHandle.on('open', (data) => {
                let cmdsPending: Promise<any>[] = [];

                if (cmds) {
                    cmds.forEach(cmd => {
                        cmdsPending.push(this.sendCommand(cmd));
                    });
                }

                Promise.all(cmdsPending).then(brkpoints => {
                    resolve();
                });
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

    public sanitize(text: string, MI: boolean): string {
        text = text.replace(/&"/g, '')
                   .replace(/\\n/g, '')
                   .replace(/\\r/g, '')
                   .replace(/\\t/g, '\t')
                   .replace(/\\v/g, '\v')
                   .replace(/\\\"/g, '\"')
                   .replace(/\\\'/g, '\'')
                   .replace(/\\\\/g, '\\');

        // If we are sanitizing MI output there are additional things we need
        // to strip out
        if (MI) {
            text = text.replace(/^~"[0-9]*/g, '').replace(/"$/g, '');
        }

        return text;
    }

    private createEnvVarsCmd(envVars: object) : string {
        let cmd = "";

        Object.keys(envVars).forEach(function(key) {
            cmd =  `export ${key} = ${envVars[key]}; ${cmd}`;
        });

        return cmd;
    }

    // Called on any stdout produced by GDB Process
    private stdoutHandler(data) {
        let record:(Record | null);
        let str = data.toString('utf8');
        this.ob += str;

        // We may be receiving buffered output. In such case defer parsing until
        // full output has been transmitted as denoted by a trailing newline
        let nPos = this.ob.lastIndexOf('\n')
        if (nPos != -1) {
            this.ob = this.ob.substr(0, nPos);

            // If multiple lines have buffered, handle each one
            let lines = this.ob.substr(0, nPos).split('\n') as string[];

            // Flush output buffer for next round of output
            this.ob = this.ob.substring(nPos + 1);

            lines.forEach(line => {
                try {
                    if (record = this.parser.parse(line)) {
                        this.handleParsedResult(record);
 
                        // Minimize the amount of logging
                        if (record.constructor == StreamRecord) {
                            this.emit(EVENT_OUTPUT, this.sanitize(record.prettyPrint(), true));
                        }
                    }
                } catch (error) {
                    console.error(error.stack);
                    this.emit(EVENT_ERROR_FATAL);
                }
            });
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
                                            if (this.handleSIGINT) {
                                                this.emit(reason, this.threadID);
                                            } else {
                                                // Reset for next signal since commands are honored in sync
                                                this.handleSIGINT = true;
                                            }
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
                        // Listen for thread events
                        if (record.getClass() == EVENT_THREAD_NEW) {
                            this.emit(EVENT_THREAD_NEW, record.getResult("id"));
                        }
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
            let bpsPending: Promise<any>[] = [];
            let bpsVerified: Breakpoint[] = [];

            if (bps) {
                bps.forEach((bp) => {
                    let promise = this.sendCommand(`-break-insert -f ${sourceFile}:${bp.line}`);
                    bpsPending.push(promise);
                    promise.then((record: ResultRecord) => {
                        // If this is a conditional breakpoint we must relay the
                        // expression to GDB and update the breakpoint
                        let bpInfo = record.getResult("bkpt");

                        if (bp.condition) {
                            promise = this.sendCommand(`-break-condition ${bpInfo.number} ${bp.condition}`);
                            promise.then((record: ResultRecord) => {
                                bpsVerified.push(new Breakpoint(true, bpInfo.line));
                            });
                        } else {
                            bpsVerified.push(new Breakpoint(true, bpInfo.line));
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
                    // TODO: timing on this seems to be off for remoteSSH
                    vscode.commands.executeCommand('workbench.action.terminal.clear').then(() => {
                        resolve();
                    });
                });
            });
        });
    }

    public attachInferior(): Promise<any> {
        // Only for attach requests
        return new Promise((resolve, reject) => {
            this.sendCommand(`-gdb-set target-async on`).then(() => {
                this.sendCommand(`attach ${this.PID}`).then(() => {
                    // TODO: will likely need to clear terminal as well like in launchRequest
                    return this.sendCommand(`-exec-continue`).then(() => {
                        resolve();
                    });
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
                resolve(this.sanitize(record.getResult("value"), false));
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
            // See https://github.com/microsoft/debug-adapter-protocol/issues/118
            if (expr == "up" || expr == "down") {
                this.emit(EVENT_RUNNING, this.threadID, true);
                this.emit(EVENT_PAUSED);
            }
        });
    }

    public getThreads(): Promise<any> {
        return new Promise((resolve, reject) => {
            this.sendCommand(`-thread-info`).then((record: ResultRecord) => {
                let threadsResult: Thread[] = [];
                let threads = record.getResult("threads");
                for (var i = 0, len = threads.length; i < len; i++) {
                    let thread = new Thread(parseInt(threads[i].id), threads[i].name);
                    threadsResult.push(thread);
                }
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
                let stackFinal: StackFrame[] = [];
                record.getResult("stack").forEach(frame => {
                    frame = frame[1];
                    stackFinal.push(new StackFrame(threadID + parseInt(frame.level),
                                                   frame.func,
                                                   new Source(frame.file, frame.fullname),
                                                   parseInt(frame.line)));
                });

                resolve(stackFinal);
            });
        });
    }

    public getVars(reference: number): Promise<any> {
        return new Promise((resolve, reject) => {
            // TODO: support more than just frame locals
            this.sendCommand(`-stack-list-variables --thread ${this.threadID} --frame ${reference - this.threadID} --all-values`).then((record: Record) => {
                resolve(record.getResult("variables"));
            });
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

    // If catchSignal is false, we will not emit a stopped event. This is a
    // workaround for automatically pausing the debugger for user executed
    // commands while the inferior is running
    public pause(threadID?: number, catchSignal?: boolean): Promise<any> {
        if (catchSignal !== undefined && !catchSignal) {
            this.handleSIGINT = false;
        }

        return this.sendCommand(`-exec-interrupt ${threadID || ""}`);
    }

    public quit(attach: boolean): Promise<any> {
        return new Promise(async (resolve, reject) => { 
            if (attach) {
                await this.sendCommand(`detach`);
            }

            return this.sendCommand(`-gdb-exit`);
        });
    }
}