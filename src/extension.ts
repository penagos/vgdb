'use strict';

import * as vscode from 'vscode';
import {
  WorkspaceFolder,
  DebugConfiguration,
  CancellationToken,
  ProviderResult,
  OutputChannel,
} from 'vscode';
import {DebugSession} from './DebugSession';
import * as Net from 'net';

class GDBConfigurationProvider implements vscode.DebugConfigurationProvider {
  private server?: Net.Server;
  private outputChannel: OutputChannel;

  public constructor(outputChannel: OutputChannel) {
    this.outputChannel = outputChannel;
  }

  /**
   * Massage a debug configuration just before a debug session is being launched,
   * e.g. add all missing attributes to the debug configuration.
   */
  resolveDebugConfiguration(
    folder: WorkspaceFolder | undefined,
    config: DebugConfiguration,
    token?: CancellationToken
  ): ProviderResult<DebugConfiguration> {
    // if launch.json is missing or empty
    if (!config.type && !config.request && !config.name) {
      const editor = vscode.window.activeTextEditor;
      if (
        editor &&
        (editor.document.languageId === 'cpp' ||
          editor.document.languageId === 'c')
      ) {
        config.type = 'vgdb';
        config.name = 'Launch';
        config.request = 'launch';
        config.program = 'a.out';
        config.stopOnEntry = true;
      }
    }

    if (!this.server) {
      // start listening on a random port
      this.server = Net.createServer(socket => {
        const session = new DebugSession(this.outputChannel);
        session.setRunAsServer(true);
        session.start(<NodeJS.ReadableStream>socket, socket);
      }).listen(0);
    }

    const address = this.server.address() as Net.AddressInfo;
    if (address) {
      config.debugServer = address.port;
    }

    return config;
  }
}

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('extension.vgdb.getProgramName', () => {
      return vscode.window.showInputBox({
        placeHolder: 'Enter the path to the executable to debug',
        value: 'a.out',
      });
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.vgdb.getProgramPID', () => {
      return vscode.window.showInputBox({
        placeHolder: 'Enter PID of program to attach to',
        value: '',
      });
    })
  );

  // Create the debug output and terminal windows once on activation event
  // to prevent spawning new terminals on each launch request
  const provider = new GDBConfigurationProvider(
    vscode.window.createOutputChannel('vGDB')
  );
  context.subscriptions.push(
    vscode.debug.registerDebugConfigurationProvider('vgdb', provider)
  );
}

export function deactivate() {}
