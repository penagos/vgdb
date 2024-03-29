/* eslint-disable @typescript-eslint/no-explicit-any */
import {exec} from 'child_process';
import {EventEmitter} from 'events';
import * as fs from 'fs';
import {WriteStream} from 'fs';
import * as vscode from 'vscode';
import * as ts from 'tail-stream';
import {CompletionItem, OutputChannel, Terminal} from 'vscode';
import {AttachRequestArguments, LaunchRequestArguments} from '../DebugSession';
import {Breakpoint} from 'vscode-debugadapter';
// eslint-disable-next-line node/no-extraneous-import
import {DebugProtocol} from 'vscode-debugprotocol';
import {OutputRecord} from './gdb/parser/OutputRecord';
import {ResultRecord} from './gdb/parser/ResultRecord';
import path = require('path');

export const SCOPE_LOCAL = 100000;
export const SCOPE_REGISTERS = 200000;

export const EXCEPTION_THROW = 'throw';
export const EXCEPTION_CATCH = 'catch';

export abstract class DebuggerException {
  public name: string;
  public description: string;
}

export enum DebuggingVerbosity {
  OFF = 'off',
  BASIC = 'basic',
  VERBOSE = 'verbose',
}

export class DebuggerVariable {
  public name: string;

  // The unique "name" assigned by the underlying MI debugger need not be identical
  // to the actual source location name
  public debuggerName: string;
  public numberOfChildren: number;
  public referenceID: number;
  public value: string;
  public type: string;
}
export abstract class Debugger extends EventEmitter {
  protected cwd: string;
  protected debuggerPath: string;
  protected debuggerArgs: string[];
  protected debuggerServerAddress: string;
  protected debuggerServerPath: string;
  protected debuggerServerArgs: string[];
  protected environmentVariables: string[];
  protected inferiorProgram: string | number;
  protected attachPID: number;
  protected startupCommands: string[];
  protected userSpecifiedDebuggerArguments: string[];
  protected useAbsoluteFilePathsForBreakpoints: boolean;
  protected useExternalTerminal: boolean;

  // Should we only load certain libraries?
  protected sharedLibraries: string[] = [];

  // The current thread on which the debugger is stopped on. If the debugger
  // is not currently stopped on any thread, this value is -1.
  protected threadID = -1;

  // Filepaths to input and output pipes used for IPC with debugger process
  protected inferiorInputFileName = '';
  protected inferiorOutputFileName = '';

  protected lastException: DebuggerException | null = null;

  // IO handles to actual pipes. The input handle is an actual FIFO handle
  // while the output handle is a normal fd
  protected inferiorInputHandle: WriteStream;
  protected inferiorOutputHandle: any;

  // Should any debug logging occur?
  protected debug = DebuggingVerbosity.OFF;

  // Is the debugger ready to start accepting commands?
  protected isDebuggerReady = false;

  // Is it safe to request continued execution of the inferior process?
  protected inferiorRunning = false;

  // Is this a launch or attach request?
  protected type = '';

  protected static terminal: Terminal;

  constructor(
    private readonly outputChannel: OutputChannel,
    protected readonly enableReverseDebugging: boolean
  ) {
    super();
  }

  public spawn(
    args: LaunchRequestArguments | AttachRequestArguments
  ): Promise<boolean> {
    this.applyArguments(args);

    return new Promise(resolve => {
      this.createIOPipeNames().then(() => {
        this.createAndBindIOPipeHandles().then(() => {
          this.createTerminalAndLaunchDebugger();
          this.runStartupCommands().then(() => {
            this.handleInferiorInputCreated().then(() => resolve(true));
          });
        });
      });
    });
  }

  public getLastException(): DebuggerException | null {
    return this.lastException;
  }

  public abstract attachInferior(): Promise<any>;
  public abstract clearBreakpoints(fileName: string): Promise<boolean>;
  public abstract createVariable(name: string): Promise<DebuggerVariable>;
  public abstract continue(threadID?: number): Promise<OutputRecord>;
  public abstract evaluateExpression(
    expr: string,
    frameID?: number
  ): Promise<any>;
  public abstract getStackTrace(
    threadID: number
  ): Promise<DebugProtocol.StackFrame[]>;
  public abstract getCommandCompletions(
    command: string
  ): Promise<CompletionItem[]>;
  public abstract getDisassembly(memoryAddress: string): Promise<any>;
  public abstract getThreads(): Promise<any>;
  public abstract getVariable(name: string): DebuggerVariable | undefined;
  public abstract getVariables(referenceID: number): Promise<any>;
  public abstract goto(file: string, line: number): Promise<boolean>;
  public abstract next(
    threadID: number,
    granularity: string
  ): Promise<OutputRecord>;
  public abstract pause(
    threadID?: number,
    ignorePause?: boolean
  ): Promise<boolean>;
  public abstract sendCommand(command: string): Promise<OutputRecord>;
  public abstract sendUserCommand(
    command: string,
    frameID?: number
  ): Promise<ResultRecord>;
  public abstract setBreakpoints(
    fileName: string,
    breakpoints: DebugProtocol.SourceBreakpoint[]
  ): Promise<Breakpoint[]>;
  public abstract setExceptionBreakpoints(filter: string[]): Promise<boolean>;
  public abstract setFunctionBreakpoints(
    breakpoints: DebugProtocol.FunctionBreakpoint[]
  ): Promise<Breakpoint[]>;
  public abstract spawnDebugger(): Promise<boolean>;
  public abstract setVariable(
    referenceID: number,
    args: DebugProtocol.SetVariableArguments
  ): Promise<OutputRecord | null>;
  public abstract stepIn(threadID: number): Promise<OutputRecord>;
  public abstract stepOut(threadID: number): Promise<OutputRecord>;
  public abstract stepBack(threadID: number): Promise<OutputRecord>;
  public abstract startInferior(): Promise<any>;
  public abstract terminate(): Promise<any>;
  public abstract launchInferior(): Promise<any>;
  public abstract reverseContinue(threadID: number): Promise<OutputRecord>;
  protected abstract createDebuggerLaunchCommand(): string[];
  protected abstract handleInferiorOutput(data: any): void;
  protected abstract handlePostDebuggerStartup(): Promise<boolean>;

  public setInferiorLaunched(hasLaunched: boolean) {
    this.inferiorRunning = hasLaunched;
  }

  protected isStopped(): boolean {
    return this.threadID !== -1;
  }

  protected log(text: string) {
    if (this.debug !== DebuggingVerbosity.OFF) {
      this.outputChannel.appendLine(text);
    }
  }

  public sanitize(text: string, MI?: boolean): string {
    text = (text || '')
      .replace(/&"/g, '')
      .replace(/\\r/g, '')
      .replace(/\\t/g, '\t')
      .replace(/\\v/g, '\v')
      .replace(/\\"/g, '"')
      .replace(/\\'/g, "'")
      .replace(/\\\\/g, '\\');

    // If we are sanitizing MI output there are additional things we need
    // to strip out
    if (MI) {
      text = text.replace(/^~"*/g, '').replace(/"$/g, '');

      // TODO: is it safe to do this for both cases??
      text = text.replace(/\\n/g, '\n');
    } else {
      text = text.replace(/\\n/g, '');
    }

    return text;
  }

  protected getNormalizedFileName(fileName: string): string {
    if (!this.useAbsoluteFilePathsForBreakpoints) {
      return path.basename(fileName);
    } else {
      return fileName;
    }
  }

  private applyArguments(args: any) {
    this.cwd = args.cwd || '';
    this.debuggerPath = args.debugger || this.debuggerPath;
    this.debuggerArgs = args.debuggerArgs || this.debuggerArgs;
    this.debuggerServerAddress = args.debuggerServerAddress || this.debuggerServerAddress;
    this.debuggerServerPath = args.debuggerServerPath || this.debuggerServerPath;
    this.debuggerServerArgs = args.debuggerServerArgs || this.debuggerServerArgs;
    this.environmentVariables = args.environmentVariables || [];
    this.startupCommands = args.startupCmds || [];
    this.useExternalTerminal = args.externalConsole || false;
    this.useAbsoluteFilePathsForBreakpoints =
      args.useAbsoluteFilePaths || false;
    this.userSpecifiedDebuggerArguments = args.args || [];
    this.sharedLibraries = args.sharedLibraries || [];
    this.debug = args.debug || DebuggingVerbosity.OFF;
    this.type = args.request;
  }

  private createTerminalAndLaunchDebugger(): void {
    // We cannot simply send all commands to the terminal and assume the
    // user's default shell is bash. Instead we will wrap all cmds in a
    // string and explicitly invoke the bash shell
    const env = {};
    Object.keys(this.environmentVariables).forEach((key: string) => {
      const value = this.environmentVariables[key];
      env[key] = value;
    });

    // Using debugSession.runInTerminalRequest will not work well with
    // attempting to evaluate inline tty (or arbitrary shell commands)
    // presumably due to some API text escaping introduced in VSCode 1.68.0
    // Reuse prior terminal from previous launches if available
    Debugger.terminal =
      Debugger.terminal ||
      vscode.window.createTerminal({
        name: 'vGDB',
        cwd: this.cwd,
        env: env,
      });

    Debugger.terminal.sendText(this.createDebuggerLaunchCommand().join(' '));
    Debugger.terminal.show();
  }

  private createIOPipeNames(): Promise<boolean> {
    this.inferiorInputFileName = this.generateRandomTmpFileName('In');
    this.inferiorOutputFileName = this.generateRandomTmpFileName('Out');

    // Create a UNIX pipe to the input file such that we can continually
    // write commands
    return new Promise(resolve => {
      exec(`mkfifo ${this.inferiorInputFileName}`).on('exit', () =>
        resolve(true)
      );
    });
  }

  private createAndBindIOPipeHandles(): Promise<boolean> {
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
    return new Promise(resolve => {
      fs.writeFileSync(this.inferiorOutputFileName, '');
      this.inferiorInputHandle = fs.createWriteStream(
        this.inferiorInputFileName,
        {flags: 'a'}
      );
      this.inferiorOutputHandle = ts.createReadStream(
        this.inferiorOutputFileName
      );

      this.inferiorOutputHandle.on('data', (data: any) =>
        this.handleInferiorOutput(data)
      );

      resolve(true);
    });
  }

  /**
   * Callback that runs once the input handler pipe has been opened. At this
   * point, we can send arbitrary commands to the debugger and except output.
   */
  private handleInferiorInputCreated(): Promise<boolean> {
    return new Promise(resolve => {
      Promise.all([
        this.runStartupCommands(),
        this.handlePostDebuggerStartup(),
      ]).then(() => {
        this.isDebuggerReady = true;
        resolve(true);
      });
    });
  }

  /**
   * Once the debugger has been launched, immediately run any startup commands
   * specified by the user in their launch configuration. Once all startup
   * commands have finished executing, allow launch request to continue
   */
  private runStartupCommands(): Promise<boolean> {
    return new Promise(resolve => {
      const pendingCommands: Promise<OutputRecord>[] = [];

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
        result += characters.charAt(
          Math.floor(Math.random() * charactersLength)
        );
      }
      return result;
    };

    return `/tmp/vGDB_${fileName}${generateRandomID(8)}`;
  }
}
