'use strict';

import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {

	context.subscriptions.push(vscode.commands.registerCommand('extension.vgdb.getProgramName', config => {
		return vscode.window.showInputBox({
			placeHolder: "Enter the path to the executable to debug",
			value: "a.out"
		});
	}));
}

export function deactivate() {
}
