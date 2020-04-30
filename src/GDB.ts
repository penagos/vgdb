import { spawn, ChildProcess } from "child_process";

export class GDB {
    private pHandle: ChildProcess;
    private path: string;
    private args: any;

    public constructor() {
        this.path = 'gdb';
        this.args = ['--interpreter=mi2'];
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

    // Called on any stdout produced by GDB Process
    private stdoutHandler() {

    }

    // Called on any stderr produced by GDB Process
    private stderrHandler() {

    }
}