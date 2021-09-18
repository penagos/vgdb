// eslint-disable-next-line node/no-extraneous-import
import {DebugProtocol} from 'vscode-debugprotocol';
import {
  InitializedEvent,
  LoggingDebugSession,
  TerminatedEvent,
  StoppedEvent,
  StackFrame,
  Thread,
  ContinuedEvent,
  OutputEvent,
  Variable,
  ThreadEvent,
  CompletionItem
} from 'vscode-debugadapter';
import {
  GDB,
  EVENT_BREAKPOINT_HIT,
  EVENT_END_STEPPING_RANGE,
  EVENT_RUNNING,
  EVENT_EXITED_NORMALLY,
  EVENT_FUNCTION_FINISHED,
  EVENT_OUTPUT,
  EVENT_SIGNAL,
  EVENT_PAUSED,
  EVENT_ERROR,
  EVENT_ERROR_FATAL,
  EVENT_THREAD_NEW,
  SCOPE_LOCAL,
  SCOPE_REGISTERS
} from './GDB';
import * as vscode from 'vscode';
import {OutputChannel, Terminal} from 'vscode';

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
export class GDBDebugSession extends LoggingDebugSession {
  private GDB: GDB;
  private outputChannel: OutputChannel;
  private terminal: Terminal;
  private debug: boolean;

  public constructor(terminal: Terminal, outputChannel: OutputChannel) {
    super();
    this.debug = true;

    // The outputChannel is to separate debug logging from the adapter
    // from the output of GDB. We need to clear it on each launch
    // request to remove stale output from prior runs
    this.terminal = terminal;
    this.outputChannel = outputChannel;
    this.outputChannel.clear();
    this.GDB = new GDB(this.outputChannel);
  }

  protected log(text: string): void {
    if (this.debug) {
      this.outputChannel.appendLine(text);
    }
  }

  protected error(text: string): void {
    console.error(text);

    // We do not cache the value in the adapter's constructor so that any
    // changes can immediately take effect
    if (vscode.workspace.getConfiguration('vgdb').get('showErrorPopup')) {
      vscode.window.showErrorMessage(text);
    }
  }

  protected launchDebugger(
    args: AttachRequestArguments | LaunchRequestArguments,
    response: DebugProtocol.AttachResponse | DebugProtocol.LaunchResponse
  ): void {
    // Only send initialized response once GDB is fully spawned
    this.GDB.setCWD(args.cwd);
    this.GDB.setDebug(args.debug || DebugLoggingLevel.OFF);
    this.GDB.spawn(args, this.terminal).then(() => {
      // If deferred symbols are to be used, set that here
      if (args.sharedLibraries !== undefined) {
        // Since commands are sent in a blocking manner we do not need
        // to spin on this request before responding to the launchRequest
        this.GDB.deferLibraryLoading(args.sharedLibraries);
      }

      this.sendResponse(response);
    });
  }

  protected async initializeRequest(
    response: DebugProtocol.InitializeResponse,
    args: DebugProtocol.InitializeRequestArguments
  ): Promise<void> {
    // Bind error handler for unexpected GDB errors
    this.GDB.on(EVENT_ERROR_FATAL, (tid: number) => {
      this.error(
        'vGDB has encountered a fatal error. Please check the vGDB output channel and create an issue at http://www.github.com/penagos/vgdb/issues'
      );
      this.sendEvent(new TerminatedEvent());
    });

    // Pipe to debug console
    this.GDB.on(EVENT_OUTPUT, (text: string) => {
      // Massage GDB output as much as possible
      this.sendEvent(new OutputEvent(text + '\n', 'console'));
    });

    // Events triggered by debuggeer
    this.GDB.on(EVENT_RUNNING, (threadID: number, allThreads: boolean) => {
      this.sendEvent(new ContinuedEvent(threadID, allThreads));
    });

    this.GDB.on(EVENT_BREAKPOINT_HIT, (threadID: number) => {
      this.sendEvent(new StoppedEvent('breakpoint', threadID));
    });

    this.GDB.on(EVENT_END_STEPPING_RANGE, (threadID: number) => {
      this.sendEvent(new StoppedEvent('step', threadID));
    });

    this.GDB.on(EVENT_FUNCTION_FINISHED, (threadID: number) => {
      this.sendEvent(new StoppedEvent('step-out', threadID));
    });

    this.GDB.on(EVENT_EXITED_NORMALLY, () => {
      this.sendEvent(new TerminatedEvent());
    });

    this.GDB.on(EVENT_SIGNAL, (threadID: number) => {
      // TODO: handle other signals
      this.sendEvent(new StoppedEvent('pause', threadID));
    });

    this.GDB.on(EVENT_PAUSED, () => {
      this.sendEvent(new StoppedEvent('pause', 1));
    });

    this.GDB.on(EVENT_ERROR, (msg: string) => {
      // We do not cache the value in the adapter's constructor so
      // that any changes can immediately take effect
      if (vscode.workspace.getConfiguration('vgdb').get('showErrorPopup')) {
        vscode.window.showErrorMessage(msg);
      }
    });

    this.GDB.on(EVENT_THREAD_NEW, (threadID: number) => {
      this.sendEvent(new ThreadEvent('started', threadID));
    });

    response.body = response.body || {};
    response.body.supportsEvaluateForHovers = true;
    response.body.supportsSetVariable = true;
    response.body.supportsEvaluateForHovers = true;
    response.body.supportsConfigurationDoneRequest = true;
    response.body.supportsDisassembleRequest = true;
    response.body.supportsSteppingGranularity = true;
    response.body.supportsCompletionsRequest = vscode.workspace.getConfiguration('vgdb').get('enableCommandCompletions');
    response.body.supportsStepBack = vscode.workspace.getConfiguration('vgdb').get('enableReverseDebugging');

    this.sendResponse(response);
    this.sendEvent(new InitializedEvent());
  }

  protected async attachRequest(
    response: DebugProtocol.AttachResponse,
    args: AttachRequestArguments
  ) {
    this.launchDebugger(args, response);
  }

  protected async launchRequest(
    response: DebugProtocol.LaunchResponse,
    args: LaunchRequestArguments
  ) {
    this.launchDebugger(args, response);
  }

  protected async configurationDoneRequest(
    response: DebugProtocol.ConfigurationDoneResponse,
    args: DebugProtocol.ConfigurationDoneArguments
  ) {
    // Only send initialized response once GDB is fully spawned
    if (!this.GDB.PID) {
      this.GDB.startInferior().then(() => {
        this.sendResponse(response);
      });
    } else {
      this.GDB.attachInferior().then(() => {
        this.sendResponse(response);
      });
    }
  }

  protected setBreakPointsRequest(
    response: DebugProtocol.SetBreakpointsResponse,
    args: DebugProtocol.SetBreakpointsArguments
  ): void {
    this.GDB.clearBreakpoints(args.source.path).then(() => {
      this.GDB.setBreakpoints(
        args.source.path || '',
        args.breakpoints || null
      ).then(bps => {
        response.body = {
          breakpoints: bps,
        };
        this.sendResponse(response);
      });
    });
  }

  protected threadsRequest(response: DebugProtocol.ThreadsResponse): void {
    this.GDB.getThreads().then((threads: Thread[]) => {
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
    this.GDB.getStack(args.threadId).then((stack: StackFrame[]) => {
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
    const locScope: DebugProtocol.Scope = {
      name: 'Locals',
      variablesReference: SCOPE_LOCAL + args.frameId,
      expensive: false,
      presentationHint: 'locals'
    };

    const regScope: DebugProtocol.Scope = {
      name: 'Registers',
      variablesReference: SCOPE_REGISTERS,
      expensive: true,
      presentationHint: 'registers'
    };

    response.body = {
      scopes: [
        locScope,
        regScope
      ],
    };
    this.sendResponse(response);
  }

  protected variablesRequest(
    response: DebugProtocol.VariablesResponse,
    args: DebugProtocol.VariablesArguments,
    request?: DebugProtocol.Request
  ) {
    const isLocalScope = args.variablesReference !== SCOPE_REGISTERS;
    this.GDB.getVars(args.variablesReference, isLocalScope).then(
      (vars: any[]) => {
        const variables: Variable[] = [];

        vars.forEach((variable, reference:number) => {
          // If this is a string strip out special chars
          if (isLocalScope && typeof variable.value === 'string') {
            variable.value = this.GDB.sanitize(variable.value, false);
          }

          const v: DebugProtocol.Variable = new Variable(variable.name, variable.value, variable.hasChildren ? reference : 0);
          variables.push(v);
        });

        response.body = {
          variables: variables,
        };

        this.sendResponse(response);
      }
    );
  }

  protected nextRequest(
    response: DebugProtocol.NextResponse,
    args: DebugProtocol.NextArguments
  ): void {
    this.GDB.next(args.threadId, args.granularity || '').then(() => {
      this.sendResponse(response);
    });
  }

  protected stepInRequest(
    response: DebugProtocol.StepInResponse,
    args: DebugProtocol.StepInArguments
  ): void {
    this.GDB.stepIn(args.threadId).then(() => {
      this.sendResponse(response);
    });
  }

  protected stepOutRequest(
    response: DebugProtocol.StepOutResponse,
    args: DebugProtocol.StepOutArguments
  ): void {
    this.GDB.stepOut(args.threadId).then(() => {
      this.sendResponse(response);
    });
  }

  protected continueRequest(
    response: DebugProtocol.ContinueResponse,
    args: DebugProtocol.ContinueArguments
  ): void {
    this.GDB.continue(args.threadId).then(() => {
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
        if (!this.GDB.isStopped()) {
          this.GDB.pause(undefined, false).then(() => {
            this.GDB.execUserCmd(args.expression, args.frameId).then(() => {
                // continue execution
                this.GDB.continue().then(() => {
                  this.sendResponse(response);
                });
              }
            );
          });
        } else {
          this.GDB.execUserCmd(args.expression, args.frameId).then(() => {
              this.sendResponse(response);
            }
          );
        }

        break;

      case 'watch':
      case 'hover':
        this.GDB.evaluateExpr(args.expression, args.frameId).then(
          (result: any) => {
            if (result) {
              response.body = {
                result: result,
                variablesReference: 0,
              };
              this.sendResponse(response);
            }
          }
        );
        break;
    }
  }

  protected pauseRequest(
    response: DebugProtocol.PauseResponse,
    args: DebugProtocol.PauseArguments
  ): void {
    this.GDB.pause(args.threadId).then(() => {
      this.sendResponse(response);
    });
  }

  protected disconnectRequest(
    response: DebugProtocol.DisconnectResponse,
    args: DebugProtocol.DisconnectArguments
  ): void {
    // If this was an attach request do not kill the inferior
    this.GDB.quit(args.terminateDebuggee === true);

    // We do not need to wait until GDB quits
    this.sendResponse(response);
  }

  protected setVariableRequest(
    response: DebugProtocol.SetVariableResponse,
    args: DebugProtocol.SetVariableArguments
  ): void {
    this.GDB.updateVar(args.name, args.value).then(() => {
      // TODO: fetch actual value from GDB
      response.body = {
        value: args.value,
      };

      this.sendResponse(response);
    });
  }

  protected completionsRequest(
    response: DebugProtocol.CompletionsResponse,
    args: DebugProtocol.CompletionsArguments
  ): void {
    this.GDB.commandCompletions(args.text, args.column).then((completions: CompletionItem[]) => {
      response.body ={
        targets: completions
      };

      this.sendResponse(response);
    });
  }

  protected disassembleRequest(
    response: DebugProtocol.DisassembleResponse,
    args: DebugProtocol.DisassembleArguments
  ): void {
    this.GDB.disassemble(args.memoryReference).then(insts => {
      response.body ={
        instructions: insts
      }
  
      this.sendResponse(response);
    });
  }
}
