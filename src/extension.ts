'use strict';

import * as vscode from 'vscode';
import { WorkspaceFolder, DebugConfiguration, CancellationToken, ProviderResult } from 'vscode';
import { GDBDebugSession } from './GDBDebugSession';
import * as Net from 'net';

class GDBConfigurationProvider implements vscode.DebugConfigurationProvider {
	private server?: Net.Server;

	/**
	 * Massage a debug configuration just before a debug session is being launched,
	 * e.g. add all missing attributes to the debug configuration.
	 */
	resolveDebugConfiguration(folder: WorkspaceFolder | undefined,
							  config: DebugConfiguration,
							  token?: CancellationToken): ProviderResult<DebugConfiguration> {
		// if launch.json is missing or empty
		if (!config.type && !config.request && !config.name) {
			const editor = vscode.window.activeTextEditor;
			if (editor && editor.document.languageId === 'matlab') {
				config.type = 'vgdb';
				config.name = 'Launch';
				config.request = 'launch';
			}
		}

		if (!this.server) {
			// start listening on a random port
			this.server = Net.createServer(socket => {
				const session = new GDBDebugSession();
				session.setRunAsServer(true);
				session.start(<NodeJS.ReadableStream>socket, socket);
			}).listen(0);
		}

		return config;
	}
}

export function activate(context: vscode.ExtensionContext) {

	context.subscriptions.push(vscode.commands.registerCommand('extension.vgdb.getProgramName', config => {
		return vscode.window.showInputBox({
			placeHolder: "Enter the path to the executable to debug",
			value: "a.out"
		});
	}));

	const provider = new GDBConfigurationProvider()
	context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider('vgdb', provider));
}

export function deactivate() {
}
