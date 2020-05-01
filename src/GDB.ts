import { spawn, ChildProcess } from "child_process";
import { MIParser } from "./parser/MIParser";
import { EventEmitter } from "events";

export class GDB extends EventEmitter {
    private pHandle: ChildProcess;
    private path: string;
    private args: any;
    private parser: MIParser;

    // Output buffering for stdout pipe
    private ob: string;

    // Track if GDB is initialized
    private initialized: boolean;

    public constructor() {
        super();

        this.path = 'gdb';
        this.args = ['--interpreter=mi2', '-q'];

        this.ob = "";
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

    public isInitialized() {
        return this.initialized;
    }

    public setInitialized() {
        console.log("GDB is initialized");
        this.initialized = true;
    }

    // Called on any stdout produced by GDB Process
    private stdoutHandler(data) {
        let str = data.toString('utf8');
        this.ob += str;

        // We may be receiving buffered output. In such case defer parser until
        // full output has been transmitted as denoted by \n
        let nPos = this.ob.lastIndexOf('\n')
        if (nPos != -1) {
            this.ob = this.ob.substr(0, nPos);

            try {
                this.parser.parse(this.ob);
            } catch(me) {
                // Relay error state to debug session
                this.emit('error');
            }
        }
    }

    // Called on any stderr produced by GDB Process
    private stderrHandler(data) {
        let str = data.toString('utf8');
        console.log("(stderr) " + str);
    }

    private 
}