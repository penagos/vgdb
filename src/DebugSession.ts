/* eslint-disable @typescript-eslint/no-unused-vars */
// eslint-disable-next-line node/no-extraneous-import
import {DebugProtocol} from 'vscode-debugprotocol';
import {
  CompletionItem,
  ContinuedEvent,
  InitializedEvent,
  LoggingDebugSession,
  OutputEvent,
  StackFrame,
  StoppedEvent,
  TerminatedEvent,
  Thread,
  ThreadEvent,
  Variable,
} from 'vscode-debugadapter';

import * as vscode from 'vscode';
import {OutputChannel, Terminal} from 'vscode';
import {GDB} from './debuggers/gdb/GDB';
import {
  Debugger,
  DebuggerVariable,
  SCOPE_LOCAL,
  SCOPE_REGISTERS,
} from './debuggers/Debugger';
import {
  EVENT_ERROR_FATAL,
  EVENT_OUTPUT,
  EVENT_RUNNING,
  EVENT_BREAKPOINT_HIT,
  EVENT_END_STEPPING_RANGE,
  EVENT_FUNCTION_FINISHED,
  EVENT_EXITED_NORMALLY,
  EVENT_SIGNAL,
  EVENT_PAUSED,
  EVENT_ERROR,
  EVENT_THREAD_NEW,
} from './debuggers/gdb/GDB';

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

  constructor(
    private readonly terminal: Terminal,
    private readonly outputChannel: OutputChannel
  ) {
    super();
  }

  /**
   * Create a new debugger and return all capabilities supported by the debug
   * adapter (common functionality across all implemented debuggers)
   */
  protected initializeRequest(
    response: DebugProtocol.InitializeResponse,
    args: DebugProtocol.InitializeRequestArguments
  ) {
    const enableReverseDebugging = this.getSettingValue(
      'enableReverseDebugging'
    );

    this.debugger = new GDB(
      this.terminal,
      this.outputChannel,
      enableReverseDebugging
    );
    this.bindDebuggerEvents();

    response.body = {
      supportsEvaluateForHovers: true,
      supportsSetVariable: true,
      supportsConfigurationDoneRequest: true,
      supportsDisassembleRequest: true,
      supportsSteppingGranularity: true,
      supportsExceptionInfoRequest: true,
      supportsCompletionsRequest: this.getSettingValue(
        'enableCommandCompletions'
      ),
      supportsStepBack: enableReverseDebugging,
      supportsFunctionBreakpoints: false,
    };

    this.sendResponse(response);
    this.sendEvent(new InitializedEvent());
  }

  /**
   * Launch debugger and setup correct state for the inferior but do NOT start
   * the actual inferior process. Such process must be started at the end of the
   * configuration sequence, after breakpoints have been set.
   */
  protected launchRequest(
    response: DebugProtocol.LaunchResponse,
    args: LaunchRequestArguments
  ) {
    this.debugger.spawn(args).then(() => {
      this.sendResponse(response);
    });
  }

  protected attachRequest(
    response: DebugProtocol.AttachResponse,
    args: AttachRequestArguments
  ) {
    this.debugger.spawn(args).then(() => {
      this.sendResponse(response);
    });
  }

  protected configurationDoneRequest(
    response: DebugProtocol.ConfigurationDoneResponse,
    args: DebugProtocol.ConfigurationDoneArguments
  ) {
    this.debugger.launchInferior().then(() => {
      vscode.commands
        .executeCommand('workbench.action.terminal.clear')
        .then(() => {
          this.sendResponse(response);
        });
    });
  }

  protected setBreakPointsRequest(
    response: DebugProtocol.SetBreakpointsResponse,
    args: DebugProtocol.SetBreakpointsArguments
  ): void {
    this.debugger
      .setBreakpoints(args.source.path || '', args.breakpoints || [])
      .then(() => {
        this.sendResponse(response);
      });
  }

  protected threadsRequest(response: DebugProtocol.ThreadsResponse): void {
    this.debugger.getThreads().then((threads: Thread[]) => {
      response.body = {
        threads: threads,
      };
      this.sendResponse(response);
    });
  }

  protected stackTraceRequest(
    response: DebugProtocol.StackTraceResponse,
    args: DebugProtocol.StackTraceArguments
  ): void {
    this.debugger.getStackTrace(args.threadId).then((stack: StackFrame[]) => {
      response.body = {
        stackFrames: stack,
        totalFrames: stack.length - 1,
      };
      this.sendResponse(response);
    });
  }

  protected scopesRequest(
    response: DebugProtocol.ScopesResponse,
    args: DebugProtocol.ScopesArguments
  ): void {
    response.body = {
      scopes: [
        {
          name: 'Locals',
          variablesReference: SCOPE_LOCAL + args.frameId,
          expensive: false,
          presentationHint: 'locals',
        },
        {
          name: 'Registers',
          variablesReference: SCOPE_REGISTERS,
          expensive: true,
          presentationHint: 'registers',
        },
      ],
    };
    this.sendResponse(response);
  }

  protected variablesRequest(
    response: DebugProtocol.VariablesResponse,
    args: DebugProtocol.VariablesArguments,
    request?: DebugProtocol.Request
  ) {
    this.debugger
      .getVariables(args.variablesReference)
      .then((vars: Map<number, DebuggerVariable>) => {
        const variables: Variable[] = [];

        vars.forEach(variable => {
          // If this is a string strip out special chars
          if (typeof variable.value === 'string') {
            variable.value = this.debugger.sanitize(variable.value, false);
          }

          const v: DebugProtocol.Variable = new Variable(
            variable.name,
            variable.value,
            variable.numberOfChildren ? variable.referenceID : 0
          );
          variables.push(v);
        });

        response.body = {
          variables: variables,
        };

        this.sendResponse(response);
      });
  }

  protected nextRequest(
    response: DebugProtocol.NextResponse,
    args: DebugProtocol.NextArguments
  ): void {
    this.debugger.next(args.threadId, args.granularity || '').then(() => {
      this.sendResponse(response);
    });
  }

  protected stepInRequest(
    response: DebugProtocol.StepInResponse,
    args: DebugProtocol.StepInArguments
  ): void {
    this.debugger.stepIn(args.threadId).then(() => {
      this.sendResponse(response);
    });
  }

  protected stepOutRequest(
    response: DebugProtocol.StepOutResponse,
    args: DebugProtocol.StepOutArguments
  ): void {
    this.debugger.stepOut(args.threadId).then(() => {
      this.sendResponse(response);
    });
  }

  protected stepBackRequest(
    response: DebugProtocol.StepBackResponse,
    args: DebugProtocol.StepBackArguments
  ): void {
    // TODO: hook up granularity to support reverse debugging at ASM level
    this.debugger.stepBack(args.threadId).then(() => {
      this.sendResponse(response);
    });
  }

  protected continueRequest(
    response: DebugProtocol.ContinueResponse,
    args: DebugProtocol.ContinueArguments
  ): void {
    this.debugger.continue(args.threadId).then(() => {
      this.sendResponse(response);
    });
  }

  protected reverseContinueRequest(
    response: DebugProtocol.ReverseContinueResponse,
    args: DebugProtocol.ReverseContinueArguments
  ): void {
    this.debugger.reverseContinue(args.threadId).then(() => {
      this.sendResponse(response);
    });
  }

  protected pauseRequest(
    response: DebugProtocol.PauseResponse,
    args: DebugProtocol.PauseArguments
  ): void {
    this.debugger.pause(args.threadId).then(() => {
      this.sendResponse(response);
    });
  }

  protected disassembleRequest(
    response: DebugProtocol.DisassembleResponse,
    args: DebugProtocol.DisassembleArguments
  ): void {
    this.debugger.getDisassembly(args.memoryReference).then(insts => {
      response.body = {
        instructions: insts,
      };

      this.sendResponse(response);
    });
  }

  protected exceptionInfoRequest(
    response: DebugProtocol.ExceptionInfoResponse,
    args: DebugProtocol.ExceptionInfoArguments
  ): void {
    const exception = this.debugger.getLastException();

    if (exception) {
      response.body = {
        exceptionId: exception.name,
        breakMode: 'unhandled',
        description: exception.description,
      };
    }

    this.sendResponse(response);
  }

  protected completionsRequest(
    response: DebugProtocol.CompletionsResponse,
    args: DebugProtocol.CompletionsArguments
  ): void {
    this.debugger
      .getCommandCompletions(args.text)
      .then((completions: CompletionItem[]) => {
        response.body = {
          targets: completions,
        };

        this.sendResponse(response);
      });
  }

  protected evaluateRequest(
    response: DebugProtocol.EvaluateResponse,
    args: DebugProtocol.EvaluateArguments
  ): void {
    // GDB enumerates frames starting from 0
    if (args.frameId) {
      --args.frameId;
    }

    switch (args.context) {
      case 'repl':
        this.debugger.pause().then((wasPaused: boolean) => {
          const isMICommand = args.expression.startsWith('-');

          if (isMICommand) {
            this.debugger.sendCommand(args.expression).then(record => {
              this.sendEvent(
                new OutputEvent(record.prettyPrint() + '\n', 'console')
              );
            });
          } else {
            this.debugger.sendUserCommand(args.expression, args.frameId);
          }

          if (!wasPaused) {
            this.debugger.continue().then(() => {
              this.sendResponse(response);
            });
          } else {
            this.sendResponse(response);
          }
        });
        break;

      case 'watch':
      case 'hover': {
        const handler = (variable: DebuggerVariable) => {
          response.body = {
            result: variable.value,
            variablesReference: variable.referenceID,
          };

          if (variable.value) {
            this.sendResponse(response);
          }
        };

        const variable = this.debugger.getVariable(args.expression);

        // If variable is already being tracked, reuse "cached" result
        if (variable) {
          handler(variable);
        } else {
          this.debugger
            .createVariable(args.expression)
            .then((variable: DebuggerVariable) => handler(variable));
        }
      }
    }
  }

  protected disconnectRequest(
    response: DebugProtocol.DisconnectResponse,
    args: DebugProtocol.DisconnectArguments
  ): void {
    // If this was an attach request do not kill the inferior
    this.debugger.terminate().then(() => {
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private getSettingValue(settingName: string): any {
    return vscode.workspace.getConfiguration('vgdb').get(settingName);
  }

  private bindDebuggerEvents(): void {
    // Bind error handler for unexpected GDB errors
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.debugger.on(EVENT_ERROR_FATAL, (error: any) => {
      this.error(
        'vGDB has encountered a fatal error. Please check the vGDB output channel and create an issue at http://www.github.com/penagos/vgdb/issues'
      );
      this.error(error);
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
