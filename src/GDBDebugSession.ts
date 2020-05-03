import { DebugProtocol } from 'vscode-debugprotocol';
import {
    InitializedEvent,
	LoggingDebugSession,
    TerminatedEvent,
    StoppedEvent,
    StackFrame,
    Thread,
    Scope
} from 'vscode-debugadapter';
import { GDB, EVENT_BREAKPOINT_HIT } from './GDB';

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
            this.GDB.on(EVENT_BREAKPOINT_HIT, (threadID: number) => {
                this.sendEvent(new StoppedEvent("breakpoint", threadID));
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

		response.body = {
			scopes: [
				new Scope("Local", SCOPE_LOCAL, false)
			]
		};
		this.sendResponse(response);
	}
}