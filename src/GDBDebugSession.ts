import { DebugProtocol } from 'vscode-debugprotocol';
import {
    InitializedEvent,
	LoggingDebugSession,
    TerminatedEvent
} from 'vscode-debugadapter';
import { GDB } from './GDB';

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

            response.body = response.body || {};
            response.body.supportsEvaluateForHovers = true;
            response.body.supportsSetVariable = true;

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
            console.log("setting breakpoints");
        }
}