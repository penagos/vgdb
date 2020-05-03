import { spawn, ChildProcess } from "child_process";
import { MIParser, STOPPED, RUNNING } from "./parser/MIParser";
import { EventEmitter } from "events";
import { Record } from "./parser/Record";
import { AsyncRecord, AsyncRecordType } from "./parser/AsyncRecord";
import { ResultRecord } from "./parser/ResultRecord";
import { StreamRecord } from "./parser/StreamRecord";
import { Breakpoint, Thread, StackFrame, Source } from "vscode-debugadapter";

// GDB stop reasons
export const EVENT_OUTPUT = "output";
export const EVENT_RUNNING = "running";
export const EVENT_BREAKPOINT_HIT = "breakpoint-hit";
export const EVENT_END_STEPPING_RANGE = "end-stepping-range";
export const EVENT_FUNCTION_FINISHED = "function-finished";
export const EVENT_EXITED_NORMALLY = "exited-normally";

export class GDB extends EventEmitter {
    private pHandle: ChildProcess;
    private path: string;
    private args: string[];
    private parser: MIParser;
    private token: number;
    private handlers: { [token: number]: (record: Record) => any };
    private threadID: number;
    private stopped: boolean;

    // Output buffering for stdout pipe
    private ob: string;

    // Track if GDB is initialized
    private initialized: boolean;

    public constructor() {
        super();

        this.path = 'gdb';
        this.args = ['--interpreter=mi2', '-q'];

        this.token = 0;
        this.threadID = -1;
        this.stopped = false;
        this.ob = "";
        this.handlers = [];
        this.parser = new MIParser();
    }

    public spawn(program: string, args: ([] | undefined)): Promise<any> {
        return new Promise((resolve, reject) => {
            // Append all user arguments as needed
            if (args) {
                this.args.push('--args');
                this.args.push(program);
                this.args = this.args.concat(args);
            } else {
                this.args.push(program);
            }

            this.pHandle = spawn(this.path, this.args);
            this.pHandle.on('error', (err) => {
                // Child process cannot be started (or killed)
                console.error('Failed to start GDB process');
                process.exit(1);
            });

            this.pHandle.stdout.on('data', this.stdoutHandler.bind(this));
            this.pHandle.stderr.on('data', this.stderrHandler.bind(this));
        });
    }

    // Send an MI command to GDB
    public sendCommand(cmd: string): Promise<any> {
        return new Promise((resolve, reject) => {
            const token = ++this.token;
            cmd = token + cmd;

            console.warn(cmd);
            this.pHandle.stdin.write(cmd + '\n');

            this.handlers[token] = (record: Record) => {
				resolve(record);
			};
        });
    }

    public isInitialized() {
        return this.initialized;
    }

    public setInitialized() {
        this.initialized = true;
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

                        // Forward output to debug console
                        this.emit(EVENT_OUTPUT, line + '\n');
                    } else if (!this.isInitialized()) {
                        this.setInitialized();
                    }
                } catch(error) {
                    // Relay error state to debug session
                    console.error(error.stack);
                    this.emit('error');
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
                                this.stopped = true;
                                this.threadID = parseInt(record.getResult("thread-id"));
                                let reason = record.getResult("reason");

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
                                        this.emit(reason)
                                    break;

                                    default:
                                        throw new Error("unknown stop reason: " + reason);
                                }
                            break;

                            case RUNNING:
                                let tid:number, all: boolean;
                                this.stopped = false;
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
                    }
                }
            break;

            case StreamRecord:
                // Forward raw GDB output to debug console
            break;
        }
    }

    // Called on any stderr produced by GDB Process
    private stderrHandler(data) {
        let str = data.toString('utf8');
        console.error(str);
    }

    public clearBreakpoints(): Promise<any>  {
        return new Promise((resolve, reject) => {

        });
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
                    let promise = this.sendCommand(`-break-insert ${sourceFile}:${bp.line}`);
                    bpsPending.push(promise);
                    promise.then((record: ResultRecord) => {
                        let bpInfo = record.getResult("bkpt");
                        let verifiedBp = new Breakpoint(true, bpInfo.line);
                        bpsVerified.push(verifiedBp);
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
        // Launch the debuggee target
        return this.sendCommand(`-exec-run`);
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
        return this.stopped;
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

    public getVars(): Promise<any> {
        return new Promise((resolve, reject) => {

        });
    }

    public next(threadID: number): Promise<any> {
        return this.sendCommand(`-exec-next --thread ${threadID}`);
    }

    public continue(threadID: number): Promise<any> {
        return this.sendCommand(`-exec-continue --thread ${threadID}`);
    }

    public stepIn(threadID: number): Promise<any> {
        return this.sendCommand(`-exec-step --thread ${threadID}`);
    }

    public stepOut(threadID: number): Promise<any> {
        return this.sendCommand(`-exec-finish --thread ${threadID}`);
    }
}