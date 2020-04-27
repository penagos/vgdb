import { DebugProtocol } from 'vscode-debugprotocol';
import {
    InitializedEvent,
	LoggingDebugSession
} from 'vscode-debugadapter';

export class GDBDebugSession extends LoggingDebugSession {
    protected async initializeRequest(response: DebugProtocol.InitializeResponse,
        args: DebugProtocol.InitializeRequestArguments): Promise<void> {
            response.body = response.body || {};

            this.sendResponse(response);
            this.sendEvent(new InitializedEvent());
        }
}