import { exec, spawn } from "child_process";
import {EventEmitter} from 'events';
import * as fs from 'fs';
import { WriteStream } from "fs";
import * as ts from 'tail-stream';
import { OutputChannel, Terminal } from "vscode";
import { AttachRequestArguments, LaunchRequestArguments } from "../DebugSession";

export class DebuggerException {
    public name: string;
    public description: string;
}

export class DebuggerVariable {
    public name: string;
    public numberOfChildren: number;
    public referenceID: number;
    public value: any;
}

// Used as an abstraction for integrated/non-integrated terminals
export abstract class TerminalWindow {
    public abstract sendCommand(cmd: string): void;
    public abstract destroy(): void;
    protected terminal: any;
}

export class IntegratedTerminal extends TerminalWindow {
    constructor(cmd: string, terminal: Terminal) {
        super();
        this.terminal = terminal;
        this.sendCommand('clear');
        this.sendCommand(cmd);
        this.terminal.show(true);
    }
    
    public sendCommand(cmd: string) {
        this.terminal.sendText(cmd);
    }
    
    public destroy() {
        // Nothing needs to be done for integrated terminal
    }
}
export class ExternalTerminal extends TerminalWindow {
    constructor(cmd: string) {
        super();
        this.terminal = spawn('x-terminal-emulator', ['-e', cmd]);
        this.terminal.on('error', () => {
            console.log('Failed to open external terminal');
        });
    }
    
    public sendCommand(cmd: string) {
        this.terminal.stdin.write(`${cmd}\n`);
    }
    
    public destroy() {
        // Close terminal if not done already
        this.terminal.kill();
    }
}

export abstract class Debugger extends EventEmitter {
    protected cwd: string;
    protected debuggerPath: string;
    protected environmentVariables: string[];
    protected inferiorProgram: string | number;
    protected startupCommands: string[];
    protected userSpecifiedDebuggerArguments: string[];
    protected useAbsoluteFilePathsForBreakpoints: boolean;
    protected useExternalTerminal: boolean;

    // Should we only load certain libraries?
    protected sharedLibraries: string[] = [];

    // The current thread on which the debugger is stopped on. If the debugger
    // is not currently stopped on any thread, this value is -1.
    protected threadID: number = -1;

    // Filepaths to input and output pipes used for IPC with debugger process
    protected inferiorInputFileName = '';
    protected inferiorOutputFileName = '';
    
    // Output buffering for stdout pipe
    //private stdoutOutputBuffer = '';
    
    // IO handles to actual pipes. The input handle is an actual FIFO handle
    // while the output handle is a normal fd
    protected inferiorInputHandle: WriteStream;
    protected inferiorOutputHandle: any;
    private debuggerTerminal: TerminalWindow;

    constructor(private readonly terminal: Terminal, private readonly outputChannel: OutputChannel) {
        super();
    }

    public spawn(args: LaunchRequestArguments | AttachRequestArguments): Promise<any> {
        // TODO: removeme
        console.log(this.outputChannel);

        this.applyArguments(args);
        this.createIOPipeNames();
        this.createTerminalAndLaunchDebugger(this.terminal);
        this.createAndBindIOPipeHandles();
        return this.runStartupCommands();
    }

    public abstract attachInferior(): Promise<any>;
    public abstract clearBreakpoints(fileName: string): Promise<any>;
    public abstract continue(threadID?: number): Promise<any>;
    public abstract getStackTrace(threadID: number): Promise<any>;
    public abstract getCommandCompletions(command: number): Promise<any>;
    public abstract getDisassembly(memoryAddress: string): Promise<any>;
    public abstract getThreads(): Promise<any>;
    public abstract getVariables(referenceID: number): Promise<any>;
    public abstract next(threadID: number, granularity: string): Promise<any>;
    public abstract pause(threadID: number): Promise<any>;
    public abstract sendCommand(command: string, ): Promise<any>;
    public abstract sendUserCommand(command: string): Promise<any>;
    public abstract setBreakpoints(fileName: string, breakpoints: any[]): Promise<any>;
    public abstract spawnDebugger(): Promise<any>;
    public abstract stepIn(threadID: number): Promise<any>;
    public abstract stepOut(threadID: number): Promise<any>;
    public abstract startInferior(): Promise<any>;
    public abstract terminate(): Promise<any>;
    public abstract launchInferior(): Promise<any>;

    protected abstract createDebuggerLaunchCommand(): string;
    protected abstract handleInferiorOutput(data: any): void;
    protected abstract handlePostDebuggerStartup(): Promise<any>;

    protected log(text: string) {
        this.outputChannel.appendLine(text);
    }

    protected getNormalizedFileName(fileName: string): string {
        if (this.useAbsoluteFilePathsForBreakpoints) {
            fileName = fileName.replace(this.cwd, '').replace(/^\//, '');
        }

        return fileName;
    }

    private applyArguments(args: any) {
        this.cwd = args.cwd || '';
        this.debuggerPath = args.debugger || this.debuggerPath;
        this.environmentVariables = args.envVars || [];
        this.inferiorProgram = args.program;
        this.startupCommands = args.startupCmds || [];
        this.useExternalTerminal = args.externalConsole || false;
        this.useAbsoluteFilePathsForBreakpoints = args.useAbsoluteFilePaths || true;
        this.userSpecifiedDebuggerArguments = args.args || [];
    }
    
    private createTerminalAndLaunchDebugger(terminal: Terminal) {
        // We cannot simply send all commands to the terminal and assume the
        // user's default shell is bash. Instead we will wrap all cmds in a
        // string and explicitly invoke the bash shell
        fs.writeFile(this.inferiorOutputFileName, '', () => {});
        const launchCommand = this.createDebuggerLaunchCommand();
        
        if (this.useExternalTerminal) {
            this.debuggerTerminal = new ExternalTerminal(launchCommand);
        } else {
            this.debuggerTerminal = new IntegratedTerminal(launchCommand, terminal);
        }

        // TODO remove me
        console.log(this.debuggerTerminal);
    }

    private createIOPipeNames() {
        this.inferiorInputFileName = this.generateRandomTmpFileName('In');
        this.inferiorOutputFileName = this.generateRandomTmpFileName('Out');
        
        // Create a UNIX pipe to the input file such that we can continually
        // write commands
        exec(`mkfifo ${this.inferiorInputFileName}`);
    }

    private createAndBindIOPipeHandles() {
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
        this.inferiorInputHandle = fs.createWriteStream(this.inferiorInputFileName, {flags: 'a'});
        this.inferiorOutputHandle = ts.createReadStream(this.inferiorOutputFileName);

        this.inferiorOutputHandle.on('data', (data: any) => this.handleInferiorOutput(data));
        this.inferiorInputHandle.on('open', () => this.handleInferiorInputCreated());
    }

    /**
     * Callback that runs once the input handler pipe has been opened. At this
     * point, we can send arbitrary commands to the debugger and except output.
     */
    private handleInferiorInputCreated(): Promise<boolean> {
        return new Promise((resolve, reject) => {
            Promise.all([
                this.runStartupCommands(),
                this.handlePostDebuggerStartup()
            ]).then(() => resolve(true));
        });
    }

    /**
     * Once the debugger has been launched, immediately run any startup commands 
     * specified by the user in their launch configuration. Once all startup
     * commands have finished executing, allow launch request to continue
     */
    private runStartupCommands(): Promise<boolean> {
        return new Promise((resolve, reject) => {
            const pendingCommands: Promise<any>[] = [];

            this.startupCommands.forEach(cmd => {
                pendingCommands.push(this.sendCommand(cmd));
              });

            Promise.all(pendingCommands).then(() => {
                resolve(true);
              });
        });
    }

    private generateRandomTmpFileName(fileName: string): string {
        const generateRandomID = (length: number): string => {
            let result = '';
            const characters =
            'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            const charactersLength = characters.length;
            for (let i = 0; i < length; i++) {
                result += characters.charAt(Math.floor(Math.random() * charactersLength));
            }
            return result;
        };
        
        return `/tmp/vGDB_${fileName}${generateRandomID(8)}`;
    }
}