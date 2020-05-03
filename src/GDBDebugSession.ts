import { DebugProtocol } from 'vscode-debugprotocol';
import {
    InitializedEvent,
	LoggingDebugSession,
    TerminatedEvent,
    StoppedEvent,
    StackFrame,
    Thread,
    Scope,
    ContinuedEvent
} from 'vscode-debugadapter';
import { GDB, EVENT_BREAKPOINT_HIT, EVENT_END_STEPPING_RANGE, EVENT_RUNNING, EVENT_EXITED_NORMALLY, EVENT_FUNCTION_FINISHED } from './GDB';

const SCOPE_LOCAL = 1;

/**
 * This interface describes the mock-debug specific launch attributes
 * (which are not part of the Debug Adapter Protocol).
 * The schema for these attributes lives in the package.json of the mock-debug extension.
 * The interface should always match this schema.
 */
interface LaunchRequestArguments extends DebugProtocol.LaunchRequestArguments {
	/** An absolute path to the "program" to debug. */
	program: string;
	/** Automatically stop target after launch. If not specified, target does not stop. */
	stopOnEntry?: boolean;
	/** enable logging the Debug Adapter Protocol */
	trace?: boolean;
}

export class GDBDebugSession extends LoggingDebugSession {
    private GDB: GDB;

    protected async initializeRequest(
        response: DebugProtocol.InitializeResponse,
        args: DebugProtocol.InitializeRequestArguments): Promise<void> {
            this.GDB = new GDB();

            // Bind error handler for unexpected GDB errors
            this.GDB.on('error', (tid: number) => {
                console.error("vGDB has encountered a fatal error. Please report this error on http://www.github.com/penagos/vgdb/issues");
                this.sendEvent(new TerminatedEvent());
            });

            // Events triggered by debuggeer
            this.GDB.on(EVENT_RUNNING, (threadID: number, allThreads: boolean) => {
                this.sendEvent(new ContinuedEvent(threadID, allThreads));
            });

            this.GDB.on(EVENT_BREAKPOINT_HIT, (threadID: number) => {
                this.sendEvent(new StoppedEvent("breakpoint", threadID));
            });

            this.GDB.on(EVENT_END_STEPPING_RANGE, (threadID: number) => {
                this.sendEvent(new StoppedEvent("step", threadID));
            });

            this.GDB.on(EVENT_FUNCTION_FINISHED, (threadID: number) => {
                this.sendEvent(new StoppedEvent("step-out", threadID));
            });

            this.GDB.on(EVENT_EXITED_NORMALLY, () => {
                this.sendEvent(new TerminatedEvent());
            });

            response.body = response.body || {};
            response.body.supportsEvaluateForHovers = true;
            response.body.supportsSetVariable = true;
            response.body.supportsConfigurationDoneRequest = true;

            this.sendResponse(response);
            this.sendEvent(new InitializedEvent());
        }

    protected async launchRequest(response: DebugProtocol.LaunchResponse,
        args: LaunchRequestArguments) {
            // Only send initialized response once GDB is fully spawned
            this.GDB.spawn(args.program).then(() => {
                // Success
                this.sendResponse(response);
            }, (error) => {
                // Failure
                this.sendErrorResponse(response, 0, error);
                this.sendEvent(new TerminatedEvent());
            });
    }

    protected setBreakPointsRequest (
        response: DebugProtocol.SetBreakpointsResponse,
        args: DebugProtocol.SetBreakpointsArguments): void {
            this.GDB.clearBreakpoints();
            this.GDB.setBreakpoints((args.source.path || ""), args.breakpoints).then(bps => {
                response.body = {
                    breakpoints: bps
                };
                this.sendResponse(response);
            });
        }

    protected configurationDoneRequest(response: DebugProtocol.ConfigurationDoneResponse,
        args: DebugProtocol.ConfigurationDoneArguments): void {
            // Once all breakpoints have been sent and synced with the debugger
            // we can start the inferior
            this.GDB.startInferior();
            super.configurationDoneRequest(response, args);
    }

    protected threadsRequest(response: DebugProtocol.ThreadsResponse): void {
        if (this.GDB.isStopped()) {
            this.GDB.getThreads().then((threads: Thread[]) => {
                response.body = {
                    threads: threads
                };
                this.sendResponse(response);
            });
        } else {
            this.sendResponse(response);
        } 
    }

    protected stackTraceRequest(response: DebugProtocol.StackTraceResponse,
        args: DebugProtocol.StackTraceArguments): void {
            this.GDB.getStack(args.threadId).then((stack: StackFrame[]) => {
                response.body = {
                    stackFrames: stack,
                    totalFrames: stack.length
                };
                this.sendResponse(response);
            });
    }

    protected scopesRequest(response: DebugProtocol.ScopesResponse,
        args: DebugProtocol.ScopesArguments): void {

        // We will always create the same scopes regardless of the state of the
        // debugger
		response.body = {
			scopes: [
				new Scope("Local", SCOPE_LOCAL, false)
			]
		};
		this.sendResponse(response);
    }

    protected variablesRequest(response: DebugProtocol.VariablesResponse,
        args: DebugProtocol.VariablesArguments,
        request?: DebugProtocol.Request) {
            // For now we assume all requests are for SCOPE_LOCAL -- will need to
            // be revisited once support for additional scopes is added
            this.GDB.getVars().then(() => {
                this.sendResponse(response);
            });
    }

    protected nextRequest(response: DebugProtocol.NextResponse,
        args: DebugProtocol.NextArguments): void {

        this.GDB.next(args.threadId).then(() => {
            this.sendResponse(response);
        });
    }

    protected stepInRequest(response: DebugProtocol.StepInResponse,
        args: DebugProtocol.StepInArguments): void {

        this.GDB.stepIn(args.threadId).then(() => {
            this.sendResponse(response);
        });
    }

    protected stepOutRequest(response: DebugProtocol.StepOutResponse,
        args: DebugProtocol.StepOutArguments): void {

        this.GDB.stepOut(args.threadId).then(() => {
            this.sendResponse(response);
        });
    }

    protected continueRequest(response: DebugProtocol.ContinueResponse,
        args: DebugProtocol.ContinueArguments): void {

        this.GDB.continue(args.threadId).then(() => {
            this.sendResponse(response);
        });
	}
}