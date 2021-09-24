// eslint-disable-next-line node/no-extraneous-import
import { DebugProtocol } from 'vscode-debugprotocol';
import {
  ContinuedEvent,
  InitializedEvent,
  LoggingDebugSession,
  OutputEvent,
  StoppedEvent,
  TerminatedEvent,
  ThreadEvent
} from 'vscode-debugadapter';

import * as vscode from 'vscode';
import { OutputChannel, Terminal } from 'vscode';
import { GDBNew } from './debuggers/gdb/GDBNew';
import { Debugger } from './debuggers/Debugger';
import { EVENT_ERROR_FATAL, EVENT_OUTPUT, EVENT_RUNNING, EVENT_BREAKPOINT_HIT, EVENT_END_STEPPING_RANGE, EVENT_FUNCTION_FINISHED, EVENT_EXITED_NORMALLY, EVENT_SIGNAL, EVENT_PAUSED, EVENT_ERROR, EVENT_THREAD_NEW } from './debuggers/gdb/GDB';

export enum DebugLoggingLevel {
  OFF = 'off',
  BASIC = 'basic',
  VERBOSE = 'verbose',
}

export interface LaunchRequestArguments
  extends DebugProtocol.LaunchRequestArguments {
  /** Absolute program to path to debug */
  program: string;
  /** Should inferior immediately stop? */
  stopOnEntry?: boolean;
  /** Arguments to pass to inferior */
  args?: string[];
  /** Launch directory */
  cwd: string;
  /** Debugger path */
  debugger: string;
  /** Target name */
  name: string;
  /** GDB commands to run on startp */
  startupCmds?: string[];
  /** Shell variables to set in debugger terminal */
  envVars?: {};
  /** Shared libraries for deferred symbol loading */
  sharedLibraries?: string[];
  /** How verbose should debug logging be? */
  debug?: DebugLoggingLevel;
  /** Should inferior terminal be in VSCode? */
  externalConsole?: boolean;
  /** Should absolute filepaths be used? */
  useAbsoluteFilePaths?: boolean;
}

export interface AttachRequestArguments
  extends DebugProtocol.AttachRequestArguments {
  /** PID of process to debug. */
  program: number;
  /** Debugger path */
  debugger: string;
  /** How verbose should debug logging be? */
  debug?: DebugLoggingLevel;
  /** Should inferior terminal be in VSCode? */
  externalConsole?: boolean;
  /** Should absolute filepaths be used? */
  useAbsoluteFilePaths?: boolean;
  /** Shared libraries for deferred symbol loading */
  sharedLibraries?: string[];
  /** Launch directory */
  cwd: string;
}

// This is the main class which implements the debug adapter protocol. It will
// instantiate a separate GDB object which handles spawning and interacting with
// the GDB process (i.e. parsing MI output). The session handles requests and
// responses with the IDE
export class DebugSession extends LoggingDebugSession {
  private debugger: Debugger;

  constructor(private readonly terminal: Terminal,
    private readonly outputChannel: OutputChannel) {
    super();
  }

  /**
   * Create a new debugger and return all capabilities supported by the debug
   * adapter (common functionality across all implemented debuggers)
   */
  protected async initializeRequest(
    response: DebugProtocol.InitializeResponse,
    args: DebugProtocol.InitializeRequestArguments
  ): Promise<void> {
    this.debugger = new GDBNew(this.terminal, this.outputChannel);
    this.bindDebuggerEvents();

    response.body = {
      supportsEvaluateForHovers: true,
      supportsSetVariable: true,
      supportsConfigurationDoneRequest: true,
      supportsDisassembleRequest: true,
      supportsSteppingGranularity: true,
      supportsExceptionInfoRequest: true,
      supportsCompletionsRequest: this.getSettingValue('enableCommandCompletions'),
      supportsStepBack: this.getSettingValue('enableReverseDebugging')
    };

    this.sendResponse(response);
    this.sendEvent(new InitializedEvent());
  }

  /**
   * Launch debugger and setup correct state for the inferior but do NOT start
   * the actual inferior process. Such process must be started at the end of the
   * configuration sequence, after breakpoints have been set.
   */
  protected async launchRequest(
    response: DebugProtocol.LaunchResponse,
    args: LaunchRequestArguments
  ) {
    this.debugger.spawn(args).then(() => {
      this.sendResponse(response);
    })
  }

  protected async configurationDoneRequest(
    response: DebugProtocol.ConfigurationDoneResponse,
    args: DebugProtocol.ConfigurationDoneArguments
  ) {
    this.debugger.launchInferior().then(() => {
      vscode.commands
      .executeCommand('workbench.action.terminal.clear')
      .then(() => {
        this.sendResponse(response);
      });
    })
  }

  protected setBreakPointsRequest(
    response: DebugProtocol.SetBreakpointsResponse,
    args: DebugProtocol.SetBreakpointsArguments
  ): void {
    this.debugger.setBreakpoints(args.source.path || '', args.breakpoints || []).then(() => {
      this.sendResponse(response);
    });
  }

  protected log(text: string): void {
    this.outputChannel.appendLine(text);
  }

  protected error(text: string): void {
    console.error(text);

    // We do not cache the value in the adapter's constructor so that any
    // changes can immediately take effect
    if (vscode.workspace.getConfiguration('vgdb').get('showErrorPopup')) {
      vscode.window.showErrorMessage(text);
    }
  }

  private getSettingValue(settingName: string): any {
    return vscode.workspace.getConfiguration('vgdb').get(settingName);
  }

  private bindDebuggerEvents(): void {
    // Bind error handler for unexpected GDB errors
    this.debugger.on(EVENT_ERROR_FATAL, (tid: number) => {
      this.error(
        'vGDB has encountered a fatal error. Please check the vGDB output channel and create an issue at http://www.github.com/penagos/vgdb/issues'
      );
      this.sendEvent(new TerminatedEvent());
    });

    // Pipe to debug console
    this.debugger.on(EVENT_OUTPUT, (text: string) => {
      // Massage GDB output as much as possible
      this.sendEvent(new OutputEvent(text + '\n', 'console'));
    });

    // Events triggered by debuggeer
    this.debugger.on(EVENT_RUNNING, (threadID: number, allThreads: boolean) => {
      this.sendEvent(new ContinuedEvent(threadID, allThreads));
    });

    this.debugger.on(EVENT_BREAKPOINT_HIT, (threadID: number) => {
      this.sendEvent(new StoppedEvent('breakpoint', threadID));
    });

    this.debugger.on(EVENT_END_STEPPING_RANGE, (threadID: number) => {
      this.sendEvent(new StoppedEvent('step', threadID));
    });

    this.debugger.on(EVENT_FUNCTION_FINISHED, (threadID: number) => {
      this.sendEvent(new StoppedEvent('step-out', threadID));
    });

    this.debugger.on(EVENT_EXITED_NORMALLY, () => {
      this.sendEvent(new TerminatedEvent());
    });

    this.debugger.on(EVENT_SIGNAL, (threadID: number) => {
      this.sendEvent(new StoppedEvent('exception', threadID));
    });

    this.debugger.on(EVENT_PAUSED, () => {
      this.sendEvent(new StoppedEvent('pause', 1));
    });

    this.debugger.on(EVENT_ERROR, (msg: string) => {
      // We do not cache the value in the adapter's constructor so
      // that any changes can immediately take effect
      if (vscode.workspace.getConfiguration('vgdb').get('showErrorPopup')) {
        vscode.window.showErrorMessage(msg);
      }
    });

    this.debugger.on(EVENT_THREAD_NEW, (threadID: number) => {
      this.sendEvent(new ThreadEvent('started', threadID));
    });    
  }
}
