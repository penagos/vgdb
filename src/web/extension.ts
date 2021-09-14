import * as vscode from 'vscode';
import {activateDbg} from '../activateDbg';

export function activate(context: vscode.ExtensionContext) {
  activateDbg(context);
}

export function deactivate() {
  // nothing to do
}
