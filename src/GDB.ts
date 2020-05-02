import { spawn, ChildProcess } from "child_process";
import { MIParser, STOPPED, RUNNING } from "./parser/MIParser";
import { EventEmitter } from "events";
import { Record } from "./parser/Record";
import { AsyncRecord, AsyncRecordType } from "./parser/AsyncRecord";
import { ResultRecord } from "./parser/ResultRecord";
import { StreamRecord } from "./parser/StreamRecord";

export class GDB extends EventEmitter {
    private pHandle: ChildProcess;
    private path: string;
    private args: any;
    private parser: MIParser;
    private token: number;
    private handlers: { [token: number]: (record: Record) => any };

    // Output buffering for stdout pipe
    private ob: string;

    // Track if GDB is initialized
    private initialized: boolean;

    public constructor() {
        super();

        this.path = 'gdb';
        this.args = ['--interpreter=mi2', '-q'];

        this.token = 0;
        this.ob = "";
        this.handlers = [];
        this.parser = new MIParser();
    }

    public spawn(program: string): Promise<any> {
        return new Promise((resolve, reject) => {
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
            this.pHandle.stdin.write(token + cmd + '\n');

            this.handlers[token] = (record: Record) => {
				resolve(record);
			};
        });
    }

    public isInitialized() {
        return this.initialized;
    }

    public setInitialized() {
        console.log("GDB is initialized");
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

            try {
                if (record = this.parser.parse(this.ob)) {
                    switch (record.constructor) {
                        case AsyncRecord:
                            // Notify GDB client of status change
                            switch (record.getType()) {
                                case AsyncRecordType.EXEC:
                                    switch (record.getClass()) {
                                        case STOPPED:

                                        break;

                                        case RUNNING:

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
                                    console.log("==> resolving handler " + record.getToken());
                                    delete this.handlers[record.getToken()];
                                }
                            }
                        break;

                        case StreamRecord:
                            // Forward raw GDB output to debug console
                        break;
                    }
                } else if (!this.isInitialized()) {
                    this.setInitialized();
                }
            } catch(me) {
                // Relay error state to debug session
                this.emit('error');
            }

            // Flush output buffer for next round of output
            this.ob = "";
        }
    }

    // Called on any stderr produced by GDB Process
    private stderrHandler(data) {
        let str = data.toString('utf8');
        console.log("(stderr) " + str);
    } 
}