module.exports =
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = __webpack_require__(1);
const GDBDebugSession_1 = __webpack_require__(2);
const Net = __webpack_require__(9);
class GDBConfigurationProvider {
    constructor(terminal, outputChannel) {
        this.terminal = terminal;
        this.outputChannel = outputChannel;
    }
    /**
     * Massage a debug configuration just before a debug session is being launched,
     * e.g. add all missing attributes to the debug configuration.
     */
    resolveDebugConfiguration(folder, config, token) {
        // if launch.json is missing or empty
        if (!config.type && !config.request && !config.name) {
            const editor = vscode.window.activeTextEditor;
            if (editor &&
                (editor.document.languageId === 'cpp' ||
                    editor.document.languageId === 'c')) {
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
                const session = new GDBDebugSession_1.GDBDebugSession(this.terminal, this.outputChannel);
                session.setRunAsServer(true);
                session.start(socket, socket);
            }).listen(0);
        }
        const address = this.server.address();
        if (address) {
            config.debugServer = address.port;
        }
        return config;
    }
}
function activate(context) {
    context.subscriptions.push(vscode.commands.registerCommand('extension.vgdb.getProgramName', config => {
        return vscode.window.showInputBox({
            placeHolder: 'Enter the path to the executable to debug',
            value: 'a.out',
        });
    }));
    context.subscriptions.push(vscode.commands.registerCommand('extension.vgdb.getProgramPID', config => {
        return vscode.window.showInputBox({
            placeHolder: 'Enter PID of program to attach to',
            value: '',
        });
    }));
    // Create the debug output and terminal windows once on activation event
    // to prevent spawning new terminals on each launch request
    const provider = new GDBConfigurationProvider(vscode.window.createTerminal('vGDB'), vscode.window.createOutputChannel('vGDB'));
    context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider('vgdb', provider));
}
exports.activate = activate;
function deactivate() { }
exports.deactivate = deactivate;


/***/ }),
/* 1 */
/***/ (function(module, exports) {

module.exports = require("vscode");

/***/ }),
/* 2 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GDBDebugSession = exports.DebugLoggingLevel = void 0;
const vscode_debugadapter_1 = __webpack_require__(3);
const GDB_1 = __webpack_require__(25);
const vscode = __webpack_require__(1);
var DebugLoggingLevel;
(function (DebugLoggingLevel) {
    DebugLoggingLevel["OFF"] = "off";
    DebugLoggingLevel["BASIC"] = "basic";
    DebugLoggingLevel["VERBOSE"] = "verbose";
})(DebugLoggingLevel = exports.DebugLoggingLevel || (exports.DebugLoggingLevel = {}));
// This is the main class which implements the debug adapter protocol. It will
// instantiate a separate GDB object which handles spawning and interacting with
// the GDB process (i.e. parsing MI output). The session handles requests and
// responses with the IDE
class GDBDebugSession extends vscode_debugadapter_1.LoggingDebugSession {
    constructor(terminal, outputChannel) {
        super();
        this.debug = true;
        // The outputChannel is to separate debug logging from the adapter
        // from the output of GDB. We need to clear it on each launch
        // request to remove stale output from prior runs
        this.terminal = terminal;
        this.outputChannel = outputChannel;
        this.outputChannel.clear();
        this.GDB = new GDB_1.GDB(this.outputChannel);
    }
    log(text) {
        if (this.debug) {
            this.outputChannel.appendLine(text);
        }
    }
    error(text) {
        console.error(text);
        // We do not cache the value in the adapter's constructor so that any
        // changes can immediately take effect
        if (vscode.workspace.getConfiguration('vgdb').get('showErrorPopup')) {
            vscode.window.showErrorMessage(text);
        }
    }
    initializeRequest(response, args) {
        return __awaiter(this, void 0, void 0, function* () {
            // Bind error handler for unexpected GDB errors
            this.GDB.on(GDB_1.EVENT_ERROR_FATAL, (tid) => {
                this.error('vGDB has encountered a fatal error. Please check the vGDB output channel and create an issue at http://www.github.com/penagos/vgdb/issues');
                this.sendEvent(new vscode_debugadapter_1.TerminatedEvent());
            });
            // Pipe to debug console
            this.GDB.on(GDB_1.EVENT_OUTPUT, (text) => {
                // Massage GDB output as much as possible
                this.sendEvent(new vscode_debugadapter_1.OutputEvent(text + '\n', 'console'));
            });
            // Events triggered by debuggeer
            this.GDB.on(GDB_1.EVENT_RUNNING, (threadID, allThreads) => {
                this.sendEvent(new vscode_debugadapter_1.ContinuedEvent(threadID, allThreads));
            });
            this.GDB.on(GDB_1.EVENT_BREAKPOINT_HIT, (threadID) => {
                this.sendEvent(new vscode_debugadapter_1.StoppedEvent('breakpoint', threadID));
            });
            this.GDB.on(GDB_1.EVENT_END_STEPPING_RANGE, (threadID) => {
                this.sendEvent(new vscode_debugadapter_1.StoppedEvent('step', threadID));
            });
            this.GDB.on(GDB_1.EVENT_FUNCTION_FINISHED, (threadID) => {
                this.sendEvent(new vscode_debugadapter_1.StoppedEvent('step-out', threadID));
            });
            this.GDB.on(GDB_1.EVENT_EXITED_NORMALLY, () => {
                this.sendEvent(new vscode_debugadapter_1.TerminatedEvent());
            });
            this.GDB.on(GDB_1.EVENT_SIGNAL, (threadID) => {
                // TODO: handle other signals
                this.sendEvent(new vscode_debugadapter_1.StoppedEvent('pause', threadID));
            });
            this.GDB.on(GDB_1.EVENT_PAUSED, () => {
                this.sendEvent(new vscode_debugadapter_1.StoppedEvent('pause', 1));
            });
            this.GDB.on(GDB_1.EVENT_ERROR, (msg) => {
                // We do not cache the value in the adapter's constructor so
                // that any changes can immediately take effect
                if (vscode.workspace.getConfiguration('vgdb').get('showErrorPopup')) {
                    vscode.window.showErrorMessage(msg);
                }
            });
            this.GDB.on(GDB_1.EVENT_THREAD_NEW, (threadID) => {
                this.sendEvent(new vscode_debugadapter_1.ThreadEvent('started', threadID));
            });
            response.body = response.body || {};
            response.body.supportsEvaluateForHovers = true;
            response.body.supportsSetVariable = true;
            response.body.supportsEvaluateForHovers = true;
            response.body.supportsConfigurationDoneRequest = true;
            this.sendResponse(response);
            this.sendEvent(new vscode_debugadapter_1.InitializedEvent());
        });
    }
    attachRequest(response, args) {
        return __awaiter(this, void 0, void 0, function* () {
            // TODO: support startup commands like LaunchRequest
            this.GDB.setDebug(args.debug || DebugLoggingLevel.OFF);
            this.GDB.spawn(args, this.terminal).then(() => {
                this.sendResponse(response);
            });
        });
    }
    launchRequest(response, args) {
        return __awaiter(this, void 0, void 0, function* () {
            // Only send initialized response once GDB is fully spawned
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
        });
    }
    configurationDoneRequest(response, args) {
        return __awaiter(this, void 0, void 0, function* () {
            // Only send initialized response once GDB is fully spawned
            if (!this.GDB.PID) {
                this.GDB.startInferior().then(() => {
                    this.sendResponse(response);
                });
            }
            else {
                this.GDB.attachInferior().then(() => {
                    this.sendResponse(response);
                });
            }
        });
    }
    setBreakPointsRequest(response, args) {
        this.GDB.clearBreakpoints().then(() => {
            this.GDB.setBreakpoints(args.source.path || '', args.breakpoints || null).then(bps => {
                response.body = {
                    breakpoints: bps,
                };
                this.sendResponse(response);
            });
        });
    }
    threadsRequest(response) {
        this.GDB.getThreads().then((threads) => {
            response.body = {
                threads: threads,
            };
            this.sendResponse(response);
        });
    }
    stackTraceRequest(response, args) {
        this.GDB.getStack(args.threadId).then((stack) => {
            response.body = {
                stackFrames: stack,
                totalFrames: stack.length - 1,
            };
            this.sendResponse(response);
        });
    }
    scopesRequest(response, args) {
        // We will always create the same scopes regardless of the state of the
        // debugger
        response.body = {
            scopes: [new vscode_debugadapter_1.Scope('Local', GDB_1.SCOPE_LOCAL + args.frameId, false)],
        };
        this.sendResponse(response);
    }
    variablesRequest(response, args, request) {
        // For now we assume all requests are for SCOPE_LOCAL -- will need to
        // be revisited once support for additional scopes is added
        this.GDB.getVars(args.variablesReference - GDB_1.SCOPE_LOCAL).then((vars) => {
            const variables = [];
            vars.forEach(variable => {
                // If this is a string strip out special chars
                if (typeof variable.value === 'string') {
                    variable.value = this.GDB.sanitize(variable.value, false);
                }
                variables.push(new vscode_debugadapter_1.Variable(variable.name, variable.value));
            });
            response.body = {
                variables: variables,
            };
            this.sendResponse(response);
        });
    }
    nextRequest(response, args) {
        this.GDB.next(args.threadId).then(() => {
            this.sendResponse(response);
        });
    }
    stepInRequest(response, args) {
        this.GDB.stepIn(args.threadId).then(() => {
            this.sendResponse(response);
        });
    }
    stepOutRequest(response, args) {
        this.GDB.stepOut(args.threadId).then(() => {
            this.sendResponse(response);
        });
    }
    continueRequest(response, args) {
        this.GDB.continue(args.threadId).then(() => {
            this.sendResponse(response);
        });
    }
    evaluateRequest(response, args) {
        // GDB enumerates frames starting at 0
        if (args.frameId) {
            --args.frameId;
        }
        switch (args.context) {
            case 'repl':
                // User is requesting evaluation of expr at debug console prompt.
                // We cannot simply send it while the process is running -- we need
                // to trigger an interrupt, issue the command, and continue execution
                if (!this.GDB.isStopped()) {
                    this.GDB.pause(undefined, false).then(() => {
                        this.GDB.execUserCmd(args.expression, args.frameId).then((result) => {
                            // continue execution
                            this.GDB.continue().then(() => {
                                this.sendResponse(response);
                            });
                        });
                    });
                }
                else {
                    this.GDB.execUserCmd(args.expression, args.frameId).then((result) => {
                        this.sendResponse(response);
                    });
                }
                break;
            case 'hover':
                // User has hovered over variable
                this.GDB.evaluateExpr(args.expression, args.frameId).then((result) => {
                    response.body = {
                        result: result,
                        variablesReference: 0,
                    };
                    this.sendResponse(response);
                });
                break;
            case 'watch':
                // TODO
                this.error('vGDB does not yet support watching expressions');
                break;
        }
    }
    pauseRequest(response, args) {
        this.GDB.pause(args.threadId).then(() => {
            this.sendResponse(response);
        });
    }
    disconnectRequest(response, args) {
        // If this was an attach request do not kill the inferior
        this.GDB.quit(args.terminateDebuggee == true);
        // We do not need to wait until GDB quits
        this.sendResponse(response);
    }
    setVariableRequest(response, args) {
        this.GDB.updateVar(args.name, args.value).then(() => {
            // TODO: fetch actual value from GDB
            response.body = {
                value: args.value,
            };
            this.sendResponse(response);
        });
    }
}
exports.GDBDebugSession = GDBDebugSession;


/***/ }),
/* 3 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

Object.defineProperty(exports, "__esModule", { value: true });
exports.Handles = exports.Response = exports.Event = exports.ErrorDestination = exports.CompletionItem = exports.Module = exports.Source = exports.Breakpoint = exports.Variable = exports.Scope = exports.StackFrame = exports.Thread = exports.InvalidatedEvent = exports.ProgressEndEvent = exports.ProgressUpdateEvent = exports.ProgressStartEvent = exports.CapabilitiesEvent = exports.LoadedSourceEvent = exports.ModuleEvent = exports.BreakpointEvent = exports.ThreadEvent = exports.OutputEvent = exports.ContinuedEvent = exports.StoppedEvent = exports.TerminatedEvent = exports.InitializedEvent = exports.logger = exports.Logger = exports.LoggingDebugSession = exports.DebugSession = void 0;
const debugSession_1 = __webpack_require__(4);
Object.defineProperty(exports, "DebugSession", { enumerable: true, get: function () { return debugSession_1.DebugSession; } });
Object.defineProperty(exports, "InitializedEvent", { enumerable: true, get: function () { return debugSession_1.InitializedEvent; } });
Object.defineProperty(exports, "TerminatedEvent", { enumerable: true, get: function () { return debugSession_1.TerminatedEvent; } });
Object.defineProperty(exports, "StoppedEvent", { enumerable: true, get: function () { return debugSession_1.StoppedEvent; } });
Object.defineProperty(exports, "ContinuedEvent", { enumerable: true, get: function () { return debugSession_1.ContinuedEvent; } });
Object.defineProperty(exports, "OutputEvent", { enumerable: true, get: function () { return debugSession_1.OutputEvent; } });
Object.defineProperty(exports, "ThreadEvent", { enumerable: true, get: function () { return debugSession_1.ThreadEvent; } });
Object.defineProperty(exports, "BreakpointEvent", { enumerable: true, get: function () { return debugSession_1.BreakpointEvent; } });
Object.defineProperty(exports, "ModuleEvent", { enumerable: true, get: function () { return debugSession_1.ModuleEvent; } });
Object.defineProperty(exports, "LoadedSourceEvent", { enumerable: true, get: function () { return debugSession_1.LoadedSourceEvent; } });
Object.defineProperty(exports, "CapabilitiesEvent", { enumerable: true, get: function () { return debugSession_1.CapabilitiesEvent; } });
Object.defineProperty(exports, "ProgressStartEvent", { enumerable: true, get: function () { return debugSession_1.ProgressStartEvent; } });
Object.defineProperty(exports, "ProgressUpdateEvent", { enumerable: true, get: function () { return debugSession_1.ProgressUpdateEvent; } });
Object.defineProperty(exports, "ProgressEndEvent", { enumerable: true, get: function () { return debugSession_1.ProgressEndEvent; } });
Object.defineProperty(exports, "InvalidatedEvent", { enumerable: true, get: function () { return debugSession_1.InvalidatedEvent; } });
Object.defineProperty(exports, "Thread", { enumerable: true, get: function () { return debugSession_1.Thread; } });
Object.defineProperty(exports, "StackFrame", { enumerable: true, get: function () { return debugSession_1.StackFrame; } });
Object.defineProperty(exports, "Scope", { enumerable: true, get: function () { return debugSession_1.Scope; } });
Object.defineProperty(exports, "Variable", { enumerable: true, get: function () { return debugSession_1.Variable; } });
Object.defineProperty(exports, "Breakpoint", { enumerable: true, get: function () { return debugSession_1.Breakpoint; } });
Object.defineProperty(exports, "Source", { enumerable: true, get: function () { return debugSession_1.Source; } });
Object.defineProperty(exports, "Module", { enumerable: true, get: function () { return debugSession_1.Module; } });
Object.defineProperty(exports, "CompletionItem", { enumerable: true, get: function () { return debugSession_1.CompletionItem; } });
Object.defineProperty(exports, "ErrorDestination", { enumerable: true, get: function () { return debugSession_1.ErrorDestination; } });
const loggingDebugSession_1 = __webpack_require__(11);
Object.defineProperty(exports, "LoggingDebugSession", { enumerable: true, get: function () { return loggingDebugSession_1.LoggingDebugSession; } });
const Logger = __webpack_require__(12);
exports.Logger = Logger;
const messages_1 = __webpack_require__(7);
Object.defineProperty(exports, "Event", { enumerable: true, get: function () { return messages_1.Event; } });
Object.defineProperty(exports, "Response", { enumerable: true, get: function () { return messages_1.Response; } });
const handles_1 = __webpack_require__(24);
Object.defineProperty(exports, "Handles", { enumerable: true, get: function () { return handles_1.Handles; } });
const logger = Logger.logger;
exports.logger = logger;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9tYWluLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLFlBQVksQ0FBQzs7O0FBRWIsaURBT3dCO0FBU3ZCLDZGQWZBLDJCQUFZLE9BZUE7QUFJWixpR0FsQkEsK0JBQWdCLE9Ba0JBO0FBQUUsZ0dBbEJBLDhCQUFlLE9Ba0JBO0FBQUUsNkZBbEJBLDJCQUFZLE9Ba0JBO0FBQUUsK0ZBbEJBLDZCQUFjLE9Ba0JBO0FBQUUsNEZBbEJBLDBCQUFXLE9Ba0JBO0FBQUUsNEZBbEJBLDBCQUFXLE9Ba0JBO0FBQUUsZ0dBbEJBLDhCQUFlLE9Ba0JBO0FBQUUsNEZBbEJBLDBCQUFXLE9Ba0JBO0FBQ3RILGtHQWxCQSxnQ0FBaUIsT0FrQkE7QUFBRSxrR0FsQkEsZ0NBQWlCLE9Ba0JBO0FBQUUsbUdBbEJBLGlDQUFrQixPQWtCQTtBQUFFLG9HQWxCQSxrQ0FBbUIsT0FrQkE7QUFBRSxpR0FsQkEsK0JBQWdCLE9Ba0JBO0FBQUUsaUdBbEJBLCtCQUFnQixPQWtCQTtBQUNsSCx1RkFsQkEscUJBQU0sT0FrQkE7QUFBRSwyRkFsQkEseUJBQVUsT0FrQkE7QUFBRSxzRkFsQkEsb0JBQUssT0FrQkE7QUFBRSx5RkFsQkEsdUJBQVEsT0FrQkE7QUFDbkMsMkZBbEJBLHlCQUFVLE9Ba0JBO0FBQUUsdUZBbEJBLHFCQUFNLE9Ba0JBO0FBQUUsdUZBbEJBLHFCQUFNLE9Ba0JBO0FBQUUsK0ZBbEJBLDZCQUFjLE9Ba0JBO0FBQzFDLGlHQWxCQSwrQkFBZ0IsT0FrQkE7QUFoQmpCLCtEQUEwRDtBQVN6RCxvR0FUTyx5Q0FBbUIsT0FTUDtBQVJwQixtQ0FBbUM7QUFTbEMsd0JBQU07QUFSUCx5Q0FBNkM7QUFlNUMsc0ZBZlEsZ0JBQUssT0FlUjtBQUFFLHlGQWZRLG1CQUFRLE9BZVI7QUFkaEIsdUNBQW9DO0FBZW5DLHdGQWZRLGlCQUFPLE9BZVI7QUFiUixNQUFNLE1BQU0sR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDO0FBTTVCLHdCQUFNIiwic291cmNlc0NvbnRlbnQiOlsiLyogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAqIENvcHlyaWdodCAoYykgTWljcm9zb2Z0IENvcnBvcmF0aW9uLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICogTGljZW5zZWQgdW5kZXIgdGhlIE1JVCBMaWNlbnNlLiBTZWUgTGljZW5zZS50eHQgaW4gdGhlIHByb2plY3Qgcm9vdCBmb3IgbGljZW5zZSBpbmZvcm1hdGlvbi5cbiAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQge1xuXHREZWJ1Z1Nlc3Npb24sXG5cdEluaXRpYWxpemVkRXZlbnQsIFRlcm1pbmF0ZWRFdmVudCwgU3RvcHBlZEV2ZW50LCBDb250aW51ZWRFdmVudCwgT3V0cHV0RXZlbnQsIFRocmVhZEV2ZW50LCBCcmVha3BvaW50RXZlbnQsIE1vZHVsZUV2ZW50LFxuXHRcdExvYWRlZFNvdXJjZUV2ZW50LCBDYXBhYmlsaXRpZXNFdmVudCwgUHJvZ3Jlc3NTdGFydEV2ZW50LCBQcm9ncmVzc1VwZGF0ZUV2ZW50LCBQcm9ncmVzc0VuZEV2ZW50LCBJbnZhbGlkYXRlZEV2ZW50LFxuXHRUaHJlYWQsIFN0YWNrRnJhbWUsIFNjb3BlLCBWYXJpYWJsZSxcblx0QnJlYWtwb2ludCwgU291cmNlLCBNb2R1bGUsIENvbXBsZXRpb25JdGVtLFxuXHRFcnJvckRlc3RpbmF0aW9uXG59IGZyb20gJy4vZGVidWdTZXNzaW9uJztcbmltcG9ydCB7TG9nZ2luZ0RlYnVnU2Vzc2lvbn0gZnJvbSAnLi9sb2dnaW5nRGVidWdTZXNzaW9uJztcbmltcG9ydCAqIGFzIExvZ2dlciBmcm9tICcuL2xvZ2dlcic7XG5pbXBvcnQgeyBFdmVudCwgUmVzcG9uc2UgfSBmcm9tICcuL21lc3NhZ2VzJztcbmltcG9ydCB7IEhhbmRsZXMgfSBmcm9tICcuL2hhbmRsZXMnO1xuXG5jb25zdCBsb2dnZXIgPSBMb2dnZXIubG9nZ2VyO1xuXG5leHBvcnQge1xuXHREZWJ1Z1Nlc3Npb24sXG5cdExvZ2dpbmdEZWJ1Z1Nlc3Npb24sXG5cdExvZ2dlcixcblx0bG9nZ2VyLFxuXHRJbml0aWFsaXplZEV2ZW50LCBUZXJtaW5hdGVkRXZlbnQsIFN0b3BwZWRFdmVudCwgQ29udGludWVkRXZlbnQsIE91dHB1dEV2ZW50LCBUaHJlYWRFdmVudCwgQnJlYWtwb2ludEV2ZW50LCBNb2R1bGVFdmVudCxcblx0XHRMb2FkZWRTb3VyY2VFdmVudCwgQ2FwYWJpbGl0aWVzRXZlbnQsIFByb2dyZXNzU3RhcnRFdmVudCwgUHJvZ3Jlc3NVcGRhdGVFdmVudCwgUHJvZ3Jlc3NFbmRFdmVudCwgSW52YWxpZGF0ZWRFdmVudCxcblx0VGhyZWFkLCBTdGFja0ZyYW1lLCBTY29wZSwgVmFyaWFibGUsXG5cdEJyZWFrcG9pbnQsIFNvdXJjZSwgTW9kdWxlLCBDb21wbGV0aW9uSXRlbSxcblx0RXJyb3JEZXN0aW5hdGlvbixcblx0RXZlbnQsIFJlc3BvbnNlLFxuXHRIYW5kbGVzXG59XG4iXX0=

/***/ }),
/* 4 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.DebugSession = exports.ErrorDestination = exports.InvalidatedEvent = exports.ProgressEndEvent = exports.ProgressUpdateEvent = exports.ProgressStartEvent = exports.CapabilitiesEvent = exports.LoadedSourceEvent = exports.ModuleEvent = exports.BreakpointEvent = exports.ThreadEvent = exports.OutputEvent = exports.TerminatedEvent = exports.InitializedEvent = exports.ContinuedEvent = exports.StoppedEvent = exports.CompletionItem = exports.Module = exports.Breakpoint = exports.Variable = exports.Thread = exports.StackFrame = exports.Scope = exports.Source = void 0;
const protocol_1 = __webpack_require__(5);
const messages_1 = __webpack_require__(7);
const runDebugAdapter_1 = __webpack_require__(8);
const url_1 = __webpack_require__(10);
class Source {
    constructor(name, path, id = 0, origin, data) {
        this.name = name;
        this.path = path;
        this.sourceReference = id;
        if (origin) {
            this.origin = origin;
        }
        if (data) {
            this.adapterData = data;
        }
    }
}
exports.Source = Source;
class Scope {
    constructor(name, reference, expensive = false) {
        this.name = name;
        this.variablesReference = reference;
        this.expensive = expensive;
    }
}
exports.Scope = Scope;
class StackFrame {
    constructor(i, nm, src, ln = 0, col = 0) {
        this.id = i;
        this.source = src;
        this.line = ln;
        this.column = col;
        this.name = nm;
    }
}
exports.StackFrame = StackFrame;
class Thread {
    constructor(id, name) {
        this.id = id;
        if (name) {
            this.name = name;
        }
        else {
            this.name = 'Thread #' + id;
        }
    }
}
exports.Thread = Thread;
class Variable {
    constructor(name, value, ref = 0, indexedVariables, namedVariables) {
        this.name = name;
        this.value = value;
        this.variablesReference = ref;
        if (typeof namedVariables === 'number') {
            this.namedVariables = namedVariables;
        }
        if (typeof indexedVariables === 'number') {
            this.indexedVariables = indexedVariables;
        }
    }
}
exports.Variable = Variable;
class Breakpoint {
    constructor(verified, line, column, source) {
        this.verified = verified;
        const e = this;
        if (typeof line === 'number') {
            e.line = line;
        }
        if (typeof column === 'number') {
            e.column = column;
        }
        if (source) {
            e.source = source;
        }
    }
}
exports.Breakpoint = Breakpoint;
class Module {
    constructor(id, name) {
        this.id = id;
        this.name = name;
    }
}
exports.Module = Module;
class CompletionItem {
    constructor(label, start, length = 0) {
        this.label = label;
        this.start = start;
        this.length = length;
    }
}
exports.CompletionItem = CompletionItem;
class StoppedEvent extends messages_1.Event {
    constructor(reason, threadId, exceptionText) {
        super('stopped');
        this.body = {
            reason: reason
        };
        if (typeof threadId === 'number') {
            this.body.threadId = threadId;
        }
        if (typeof exceptionText === 'string') {
            this.body.text = exceptionText;
        }
    }
}
exports.StoppedEvent = StoppedEvent;
class ContinuedEvent extends messages_1.Event {
    constructor(threadId, allThreadsContinued) {
        super('continued');
        this.body = {
            threadId: threadId
        };
        if (typeof allThreadsContinued === 'boolean') {
            this.body.allThreadsContinued = allThreadsContinued;
        }
    }
}
exports.ContinuedEvent = ContinuedEvent;
class InitializedEvent extends messages_1.Event {
    constructor() {
        super('initialized');
    }
}
exports.InitializedEvent = InitializedEvent;
class TerminatedEvent extends messages_1.Event {
    constructor(restart) {
        super('terminated');
        if (typeof restart === 'boolean' || restart) {
            const e = this;
            e.body = {
                restart: restart
            };
        }
    }
}
exports.TerminatedEvent = TerminatedEvent;
class OutputEvent extends messages_1.Event {
    constructor(output, category = 'console', data) {
        super('output');
        this.body = {
            category: category,
            output: output
        };
        if (data !== undefined) {
            this.body.data = data;
        }
    }
}
exports.OutputEvent = OutputEvent;
class ThreadEvent extends messages_1.Event {
    constructor(reason, threadId) {
        super('thread');
        this.body = {
            reason: reason,
            threadId: threadId
        };
    }
}
exports.ThreadEvent = ThreadEvent;
class BreakpointEvent extends messages_1.Event {
    constructor(reason, breakpoint) {
        super('breakpoint');
        this.body = {
            reason: reason,
            breakpoint: breakpoint
        };
    }
}
exports.BreakpointEvent = BreakpointEvent;
class ModuleEvent extends messages_1.Event {
    constructor(reason, module) {
        super('module');
        this.body = {
            reason: reason,
            module: module
        };
    }
}
exports.ModuleEvent = ModuleEvent;
class LoadedSourceEvent extends messages_1.Event {
    constructor(reason, source) {
        super('loadedSource');
        this.body = {
            reason: reason,
            source: source
        };
    }
}
exports.LoadedSourceEvent = LoadedSourceEvent;
class CapabilitiesEvent extends messages_1.Event {
    constructor(capabilities) {
        super('capabilities');
        this.body = {
            capabilities: capabilities
        };
    }
}
exports.CapabilitiesEvent = CapabilitiesEvent;
class ProgressStartEvent extends messages_1.Event {
    constructor(progressId, title, message) {
        super('progressStart');
        this.body = {
            progressId: progressId,
            title: title
        };
        if (typeof message === 'string') {
            this.body.message = message;
        }
    }
}
exports.ProgressStartEvent = ProgressStartEvent;
class ProgressUpdateEvent extends messages_1.Event {
    constructor(progressId, message) {
        super('progressUpdate');
        this.body = {
            progressId: progressId
        };
        if (typeof message === 'string') {
            this.body.message = message;
        }
    }
}
exports.ProgressUpdateEvent = ProgressUpdateEvent;
class ProgressEndEvent extends messages_1.Event {
    constructor(progressId, message) {
        super('progressEnd');
        this.body = {
            progressId: progressId
        };
        if (typeof message === 'string') {
            this.body.message = message;
        }
    }
}
exports.ProgressEndEvent = ProgressEndEvent;
class InvalidatedEvent extends messages_1.Event {
    constructor(areas, threadId, stackFrameId) {
        super('invalidated');
        this.body = {};
        if (areas) {
            this.body.areas = areas;
        }
        if (threadId) {
            this.body.threadId = threadId;
        }
        if (stackFrameId) {
            this.body.stackFrameId = stackFrameId;
        }
    }
}
exports.InvalidatedEvent = InvalidatedEvent;
var ErrorDestination;
(function (ErrorDestination) {
    ErrorDestination[ErrorDestination["User"] = 1] = "User";
    ErrorDestination[ErrorDestination["Telemetry"] = 2] = "Telemetry";
})(ErrorDestination = exports.ErrorDestination || (exports.ErrorDestination = {}));
;
class DebugSession extends protocol_1.ProtocolServer {
    constructor(obsolete_debuggerLinesAndColumnsStartAt1, obsolete_isServer) {
        super();
        const linesAndColumnsStartAt1 = typeof obsolete_debuggerLinesAndColumnsStartAt1 === 'boolean' ? obsolete_debuggerLinesAndColumnsStartAt1 : false;
        this._debuggerLinesStartAt1 = linesAndColumnsStartAt1;
        this._debuggerColumnsStartAt1 = linesAndColumnsStartAt1;
        this._debuggerPathsAreURIs = false;
        this._clientLinesStartAt1 = true;
        this._clientColumnsStartAt1 = true;
        this._clientPathsAreURIs = false;
        this._isServer = typeof obsolete_isServer === 'boolean' ? obsolete_isServer : false;
        this.on('close', () => {
            this.shutdown();
        });
        this.on('error', (error) => {
            this.shutdown();
        });
    }
    setDebuggerPathFormat(format) {
        this._debuggerPathsAreURIs = format !== 'path';
    }
    setDebuggerLinesStartAt1(enable) {
        this._debuggerLinesStartAt1 = enable;
    }
    setDebuggerColumnsStartAt1(enable) {
        this._debuggerColumnsStartAt1 = enable;
    }
    setRunAsServer(enable) {
        this._isServer = enable;
    }
    /**
     * A virtual constructor...
     */
    static run(debugSession) {
        runDebugAdapter_1.runDebugAdapter(debugSession);
    }
    shutdown() {
        if (this._isServer || this._isRunningInline()) {
            // shutdown ignored in server mode
        }
        else {
            // wait a bit before shutting down
            setTimeout(() => {
                process.exit(0);
            }, 100);
        }
    }
    sendErrorResponse(response, codeOrMessage, format, variables, dest = ErrorDestination.User) {
        let msg;
        if (typeof codeOrMessage === 'number') {
            msg = {
                id: codeOrMessage,
                format: format
            };
            if (variables) {
                msg.variables = variables;
            }
            if (dest & ErrorDestination.User) {
                msg.showUser = true;
            }
            if (dest & ErrorDestination.Telemetry) {
                msg.sendTelemetry = true;
            }
        }
        else {
            msg = codeOrMessage;
        }
        response.success = false;
        response.message = DebugSession.formatPII(msg.format, true, msg.variables);
        if (!response.body) {
            response.body = {};
        }
        response.body.error = msg;
        this.sendResponse(response);
    }
    runInTerminalRequest(args, timeout, cb) {
        this.sendRequest('runInTerminal', args, timeout, cb);
    }
    dispatchRequest(request) {
        const response = new messages_1.Response(request);
        try {
            if (request.command === 'initialize') {
                var args = request.arguments;
                if (typeof args.linesStartAt1 === 'boolean') {
                    this._clientLinesStartAt1 = args.linesStartAt1;
                }
                if (typeof args.columnsStartAt1 === 'boolean') {
                    this._clientColumnsStartAt1 = args.columnsStartAt1;
                }
                if (args.pathFormat !== 'path') {
                    this.sendErrorResponse(response, 2018, 'debug adapter only supports native paths', null, ErrorDestination.Telemetry);
                }
                else {
                    const initializeResponse = response;
                    initializeResponse.body = {};
                    this.initializeRequest(initializeResponse, args);
                }
            }
            else if (request.command === 'launch') {
                this.launchRequest(response, request.arguments, request);
            }
            else if (request.command === 'attach') {
                this.attachRequest(response, request.arguments, request);
            }
            else if (request.command === 'disconnect') {
                this.disconnectRequest(response, request.arguments, request);
            }
            else if (request.command === 'terminate') {
                this.terminateRequest(response, request.arguments, request);
            }
            else if (request.command === 'restart') {
                this.restartRequest(response, request.arguments, request);
            }
            else if (request.command === 'setBreakpoints') {
                this.setBreakPointsRequest(response, request.arguments, request);
            }
            else if (request.command === 'setFunctionBreakpoints') {
                this.setFunctionBreakPointsRequest(response, request.arguments, request);
            }
            else if (request.command === 'setExceptionBreakpoints') {
                this.setExceptionBreakPointsRequest(response, request.arguments, request);
            }
            else if (request.command === 'configurationDone') {
                this.configurationDoneRequest(response, request.arguments, request);
            }
            else if (request.command === 'continue') {
                this.continueRequest(response, request.arguments, request);
            }
            else if (request.command === 'next') {
                this.nextRequest(response, request.arguments, request);
            }
            else if (request.command === 'stepIn') {
                this.stepInRequest(response, request.arguments, request);
            }
            else if (request.command === 'stepOut') {
                this.stepOutRequest(response, request.arguments, request);
            }
            else if (request.command === 'stepBack') {
                this.stepBackRequest(response, request.arguments, request);
            }
            else if (request.command === 'reverseContinue') {
                this.reverseContinueRequest(response, request.arguments, request);
            }
            else if (request.command === 'restartFrame') {
                this.restartFrameRequest(response, request.arguments, request);
            }
            else if (request.command === 'goto') {
                this.gotoRequest(response, request.arguments, request);
            }
            else if (request.command === 'pause') {
                this.pauseRequest(response, request.arguments, request);
            }
            else if (request.command === 'stackTrace') {
                this.stackTraceRequest(response, request.arguments, request);
            }
            else if (request.command === 'scopes') {
                this.scopesRequest(response, request.arguments, request);
            }
            else if (request.command === 'variables') {
                this.variablesRequest(response, request.arguments, request);
            }
            else if (request.command === 'setVariable') {
                this.setVariableRequest(response, request.arguments, request);
            }
            else if (request.command === 'setExpression') {
                this.setExpressionRequest(response, request.arguments, request);
            }
            else if (request.command === 'source') {
                this.sourceRequest(response, request.arguments, request);
            }
            else if (request.command === 'threads') {
                this.threadsRequest(response, request);
            }
            else if (request.command === 'terminateThreads') {
                this.terminateThreadsRequest(response, request.arguments, request);
            }
            else if (request.command === 'evaluate') {
                this.evaluateRequest(response, request.arguments, request);
            }
            else if (request.command === 'stepInTargets') {
                this.stepInTargetsRequest(response, request.arguments, request);
            }
            else if (request.command === 'gotoTargets') {
                this.gotoTargetsRequest(response, request.arguments, request);
            }
            else if (request.command === 'completions') {
                this.completionsRequest(response, request.arguments, request);
            }
            else if (request.command === 'exceptionInfo') {
                this.exceptionInfoRequest(response, request.arguments, request);
            }
            else if (request.command === 'loadedSources') {
                this.loadedSourcesRequest(response, request.arguments, request);
            }
            else if (request.command === 'dataBreakpointInfo') {
                this.dataBreakpointInfoRequest(response, request.arguments, request);
            }
            else if (request.command === 'setDataBreakpoints') {
                this.setDataBreakpointsRequest(response, request.arguments, request);
            }
            else if (request.command === 'readMemory') {
                this.readMemoryRequest(response, request.arguments, request);
            }
            else if (request.command === 'writeMemory') {
                this.writeMemoryRequest(response, request.arguments, request);
            }
            else if (request.command === 'disassemble') {
                this.disassembleRequest(response, request.arguments, request);
            }
            else if (request.command === 'cancel') {
                this.cancelRequest(response, request.arguments, request);
            }
            else if (request.command === 'breakpointLocations') {
                this.breakpointLocationsRequest(response, request.arguments, request);
            }
            else if (request.command === 'setInstructionBreakpoints') {
                this.setInstructionBreakpointsRequest(response, request.arguments, request);
            }
            else {
                this.customRequest(request.command, response, request.arguments, request);
            }
        }
        catch (e) {
            this.sendErrorResponse(response, 1104, '{_stack}', { _exception: e.message, _stack: e.stack }, ErrorDestination.Telemetry);
        }
    }
    initializeRequest(response, args) {
        // This default debug adapter does not support conditional breakpoints.
        response.body.supportsConditionalBreakpoints = false;
        // This default debug adapter does not support hit conditional breakpoints.
        response.body.supportsHitConditionalBreakpoints = false;
        // This default debug adapter does not support function breakpoints.
        response.body.supportsFunctionBreakpoints = false;
        // This default debug adapter implements the 'configurationDone' request.
        response.body.supportsConfigurationDoneRequest = true;
        // This default debug adapter does not support hovers based on the 'evaluate' request.
        response.body.supportsEvaluateForHovers = false;
        // This default debug adapter does not support the 'stepBack' request.
        response.body.supportsStepBack = false;
        // This default debug adapter does not support the 'setVariable' request.
        response.body.supportsSetVariable = false;
        // This default debug adapter does not support the 'restartFrame' request.
        response.body.supportsRestartFrame = false;
        // This default debug adapter does not support the 'stepInTargets' request.
        response.body.supportsStepInTargetsRequest = false;
        // This default debug adapter does not support the 'gotoTargets' request.
        response.body.supportsGotoTargetsRequest = false;
        // This default debug adapter does not support the 'completions' request.
        response.body.supportsCompletionsRequest = false;
        // This default debug adapter does not support the 'restart' request.
        response.body.supportsRestartRequest = false;
        // This default debug adapter does not support the 'exceptionOptions' attribute on the 'setExceptionBreakpoints' request.
        response.body.supportsExceptionOptions = false;
        // This default debug adapter does not support the 'format' attribute on the 'variables', 'evaluate', and 'stackTrace' request.
        response.body.supportsValueFormattingOptions = false;
        // This debug adapter does not support the 'exceptionInfo' request.
        response.body.supportsExceptionInfoRequest = false;
        // This debug adapter does not support the 'TerminateDebuggee' attribute on the 'disconnect' request.
        response.body.supportTerminateDebuggee = false;
        // This debug adapter does not support delayed loading of stack frames.
        response.body.supportsDelayedStackTraceLoading = false;
        // This debug adapter does not support the 'loadedSources' request.
        response.body.supportsLoadedSourcesRequest = false;
        // This debug adapter does not support the 'logMessage' attribute of the SourceBreakpoint.
        response.body.supportsLogPoints = false;
        // This debug adapter does not support the 'terminateThreads' request.
        response.body.supportsTerminateThreadsRequest = false;
        // This debug adapter does not support the 'setExpression' request.
        response.body.supportsSetExpression = false;
        // This debug adapter does not support the 'terminate' request.
        response.body.supportsTerminateRequest = false;
        // This debug adapter does not support data breakpoints.
        response.body.supportsDataBreakpoints = false;
        /** This debug adapter does not support the 'readMemory' request. */
        response.body.supportsReadMemoryRequest = false;
        /** The debug adapter does not support the 'disassemble' request. */
        response.body.supportsDisassembleRequest = false;
        /** The debug adapter does not support the 'cancel' request. */
        response.body.supportsCancelRequest = false;
        /** The debug adapter does not support the 'breakpointLocations' request. */
        response.body.supportsBreakpointLocationsRequest = false;
        /** The debug adapter does not support the 'clipboard' context value in the 'evaluate' request. */
        response.body.supportsClipboardContext = false;
        /** The debug adapter does not support stepping granularities for the stepping requests. */
        response.body.supportsSteppingGranularity = false;
        /** The debug adapter does not support the 'setInstructionBreakpoints' request. */
        response.body.supportsInstructionBreakpoints = false;
        /** The debug adapter does not support 'filterOptions' on the 'setExceptionBreakpoints' request. */
        response.body.supportsExceptionFilterOptions = false;
        this.sendResponse(response);
    }
    disconnectRequest(response, args, request) {
        this.sendResponse(response);
        this.shutdown();
    }
    launchRequest(response, args, request) {
        this.sendResponse(response);
    }
    attachRequest(response, args, request) {
        this.sendResponse(response);
    }
    terminateRequest(response, args, request) {
        this.sendResponse(response);
    }
    restartRequest(response, args, request) {
        this.sendResponse(response);
    }
    setBreakPointsRequest(response, args, request) {
        this.sendResponse(response);
    }
    setFunctionBreakPointsRequest(response, args, request) {
        this.sendResponse(response);
    }
    setExceptionBreakPointsRequest(response, args, request) {
        this.sendResponse(response);
    }
    configurationDoneRequest(response, args, request) {
        this.sendResponse(response);
    }
    continueRequest(response, args, request) {
        this.sendResponse(response);
    }
    nextRequest(response, args, request) {
        this.sendResponse(response);
    }
    stepInRequest(response, args, request) {
        this.sendResponse(response);
    }
    stepOutRequest(response, args, request) {
        this.sendResponse(response);
    }
    stepBackRequest(response, args, request) {
        this.sendResponse(response);
    }
    reverseContinueRequest(response, args, request) {
        this.sendResponse(response);
    }
    restartFrameRequest(response, args, request) {
        this.sendResponse(response);
    }
    gotoRequest(response, args, request) {
        this.sendResponse(response);
    }
    pauseRequest(response, args, request) {
        this.sendResponse(response);
    }
    sourceRequest(response, args, request) {
        this.sendResponse(response);
    }
    threadsRequest(response, request) {
        this.sendResponse(response);
    }
    terminateThreadsRequest(response, args, request) {
        this.sendResponse(response);
    }
    stackTraceRequest(response, args, request) {
        this.sendResponse(response);
    }
    scopesRequest(response, args, request) {
        this.sendResponse(response);
    }
    variablesRequest(response, args, request) {
        this.sendResponse(response);
    }
    setVariableRequest(response, args, request) {
        this.sendResponse(response);
    }
    setExpressionRequest(response, args, request) {
        this.sendResponse(response);
    }
    evaluateRequest(response, args, request) {
        this.sendResponse(response);
    }
    stepInTargetsRequest(response, args, request) {
        this.sendResponse(response);
    }
    gotoTargetsRequest(response, args, request) {
        this.sendResponse(response);
    }
    completionsRequest(response, args, request) {
        this.sendResponse(response);
    }
    exceptionInfoRequest(response, args, request) {
        this.sendResponse(response);
    }
    loadedSourcesRequest(response, args, request) {
        this.sendResponse(response);
    }
    dataBreakpointInfoRequest(response, args, request) {
        this.sendResponse(response);
    }
    setDataBreakpointsRequest(response, args, request) {
        this.sendResponse(response);
    }
    readMemoryRequest(response, args, request) {
        this.sendResponse(response);
    }
    writeMemoryRequest(response, args, request) {
        this.sendResponse(response);
    }
    disassembleRequest(response, args, request) {
        this.sendResponse(response);
    }
    cancelRequest(response, args, request) {
        this.sendResponse(response);
    }
    breakpointLocationsRequest(response, args, request) {
        this.sendResponse(response);
    }
    setInstructionBreakpointsRequest(response, args, request) {
        this.sendResponse(response);
    }
    /**
     * Override this hook to implement custom requests.
     */
    customRequest(command, response, args, request) {
        this.sendErrorResponse(response, 1014, 'unrecognized request', null, ErrorDestination.Telemetry);
    }
    //---- protected -------------------------------------------------------------------------------------------------
    convertClientLineToDebugger(line) {
        if (this._debuggerLinesStartAt1) {
            return this._clientLinesStartAt1 ? line : line + 1;
        }
        return this._clientLinesStartAt1 ? line - 1 : line;
    }
    convertDebuggerLineToClient(line) {
        if (this._debuggerLinesStartAt1) {
            return this._clientLinesStartAt1 ? line : line - 1;
        }
        return this._clientLinesStartAt1 ? line + 1 : line;
    }
    convertClientColumnToDebugger(column) {
        if (this._debuggerColumnsStartAt1) {
            return this._clientColumnsStartAt1 ? column : column + 1;
        }
        return this._clientColumnsStartAt1 ? column - 1 : column;
    }
    convertDebuggerColumnToClient(column) {
        if (this._debuggerColumnsStartAt1) {
            return this._clientColumnsStartAt1 ? column : column - 1;
        }
        return this._clientColumnsStartAt1 ? column + 1 : column;
    }
    convertClientPathToDebugger(clientPath) {
        if (this._clientPathsAreURIs !== this._debuggerPathsAreURIs) {
            if (this._clientPathsAreURIs) {
                return DebugSession.uri2path(clientPath);
            }
            else {
                return DebugSession.path2uri(clientPath);
            }
        }
        return clientPath;
    }
    convertDebuggerPathToClient(debuggerPath) {
        if (this._debuggerPathsAreURIs !== this._clientPathsAreURIs) {
            if (this._debuggerPathsAreURIs) {
                return DebugSession.uri2path(debuggerPath);
            }
            else {
                return DebugSession.path2uri(debuggerPath);
            }
        }
        return debuggerPath;
    }
    //---- private -------------------------------------------------------------------------------
    static path2uri(path) {
        if (process.platform === 'win32') {
            if (/^[A-Z]:/.test(path)) {
                path = path[0].toLowerCase() + path.substr(1);
            }
            path = path.replace(/\\/g, '/');
        }
        path = encodeURI(path);
        let uri = new url_1.URL(`file:`); // ignore 'path' for now
        uri.pathname = path; // now use 'path' to get the correct percent encoding (see https://url.spec.whatwg.org)
        return uri.toString();
    }
    static uri2path(sourceUri) {
        let uri = new url_1.URL(sourceUri);
        let s = decodeURIComponent(uri.pathname);
        if (process.platform === 'win32') {
            if (/^\/[a-zA-Z]:/.test(s)) {
                s = s[1].toLowerCase() + s.substr(2);
            }
            s = s.replace(/\//g, '\\');
        }
        return s;
    }
    /*
    * If argument starts with '_' it is OK to send its value to telemetry.
    */
    static formatPII(format, excludePII, args) {
        return format.replace(DebugSession._formatPIIRegexp, function (match, paramName) {
            if (excludePII && paramName.length > 0 && paramName[0] !== '_') {
                return match;
            }
            return args[paramName] && args.hasOwnProperty(paramName) ?
                args[paramName] :
                match;
        });
    }
}
exports.DebugSession = DebugSession;
DebugSession._formatPIIRegexp = /{([^}]+)}/g;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdTZXNzaW9uLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL2RlYnVnU2Vzc2lvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7OztnR0FHZ0c7OztBQUdoRyx5Q0FBNEM7QUFDNUMseUNBQTZDO0FBQzdDLHVEQUFvRDtBQUNwRCw2QkFBMEI7QUFHMUIsTUFBYSxNQUFNO0lBS2xCLFlBQW1CLElBQVksRUFBRSxJQUFhLEVBQUUsS0FBYSxDQUFDLEVBQUUsTUFBZSxFQUFFLElBQVU7UUFDMUYsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7UUFDakIsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7UUFDakIsSUFBSSxDQUFDLGVBQWUsR0FBRyxFQUFFLENBQUM7UUFDMUIsSUFBSSxNQUFNLEVBQUU7WUFDTCxJQUFLLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztTQUM1QjtRQUNELElBQUksSUFBSSxFQUFFO1lBQ0gsSUFBSyxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUM7U0FDL0I7SUFDRixDQUFDO0NBQ0Q7QUFoQkQsd0JBZ0JDO0FBRUQsTUFBYSxLQUFLO0lBS2pCLFlBQW1CLElBQVksRUFBRSxTQUFpQixFQUFFLFlBQXFCLEtBQUs7UUFDN0UsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7UUFDakIsSUFBSSxDQUFDLGtCQUFrQixHQUFHLFNBQVMsQ0FBQztRQUNwQyxJQUFJLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQztJQUM1QixDQUFDO0NBQ0Q7QUFWRCxzQkFVQztBQUVELE1BQWEsVUFBVTtJQU90QixZQUFtQixDQUFTLEVBQUUsRUFBVSxFQUFFLEdBQVksRUFBRSxLQUFhLENBQUMsRUFBRSxNQUFjLENBQUM7UUFDdEYsSUFBSSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDWixJQUFJLENBQUMsTUFBTSxHQUFHLEdBQUcsQ0FBQztRQUNsQixJQUFJLENBQUMsSUFBSSxHQUFHLEVBQUUs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QUMsSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3pELElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO2dCQUNqQixLQUFLLENBQUM7UUFDUixDQUFDLENBQUMsQ0FBQTtJQUNILENBQUM7O0FBeG1CRixvQ0F5bUJDO0FBZmUsNkJBQWdCLEdBQUcsWUFBWSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAqICBDb3B5cmlnaHQgKGMpIE1pY3Jvc29mdCBDb3Jwb3JhdGlvbi4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqICBMaWNlbnNlZCB1bmRlciB0aGUgTUlUIExpY2Vuc2UuIFNlZSBMaWNlbnNlLnR4dCBpbiB0aGUgcHJvamVjdCByb290IGZvciBsaWNlbnNlIGluZm9ybWF0aW9uLlxuICotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXG5cbmltcG9ydCB7IERlYnVnUHJvdG9jb2wgfSBmcm9tICd2c2NvZGUtZGVidWdwcm90b2NvbCc7XG5pbXBvcnQgeyBQcm90b2NvbFNlcnZlciB9IGZyb20gJy4vcHJvdG9jb2wnO1xuaW1wb3J0IHsgUmVzcG9uc2UsIEV2ZW50IH0gZnJvbSAnLi9tZXNzYWdlcyc7XG5pbXBvcnQgeyBydW5EZWJ1Z0FkYXB0ZXIgfSBmcm9tICcuL3J1bkRlYnVnQWRhcHRlcic7XG5pbXBvcnQgeyBVUkwgfSBmcm9tICd1cmwnO1xuXG5cbmV4cG9ydCBjbGFzcyBTb3VyY2UgaW1wbGVtZW50cyBEZWJ1Z1Byb3RvY29sLlNvdXJjZSB7XG5cdG5hbWU6IHN0cmluZztcblx0cGF0aDogc3RyaW5nO1xuXHRzb3VyY2VSZWZlcmVuY2U6IG51bWJlcjtcblxuXHRwdWJsaWMgY29uc3RydWN0b3IobmFtZTogc3RyaW5nLCBwYXRoPzogc3RyaW5nLCBpZDogbnVtYmVyID0gMCwgb3JpZ2luPzogc3RyaW5nLCBkYXRhPzogYW55KSB7XG5cdFx0dGhpcy5uYW1lID0gbmFtZTtcblx0XHR0aGlzLnBhdGggPSBwYXRoO1xuXHRcdHRoaXMuc291cmNlUmVmZXJlbmNlID0gaWQ7XG5cdFx0aWYgKG9yaWdpbikge1xuXHRcdFx0KDxhbnk+dGhpcykub3JpZ2luID0gb3JpZ2luO1xuXHRcdH1cblx0XHRpZiAoZGF0YSkge1xuXHRcdFx0KDxhbnk+dGhpcykuYWRhcHRlckRhdGEgPSBkYXRhO1xuXHRcdH1cblx0fVxufVxuXG5leHBvcnQgY2xhc3MgU2NvcGUgaW1wbGVtZW50cyBEZWJ1Z1Byb3RvY29sLlNjb3BlIHtcblx0bmFtZTogc3RyaW5nO1xuXHR2YXJpYWJsZXNSZWZlcmVuY2U6IG51bWJlcjtcblx0ZXhwZW5zaXZlOiBib29sZWFuO1xuXG5cdHB1YmxpYyBjb25zdHJ1Y3RvcihuYW1lOiBzdHJpbmcsIHJlZmVyZW5jZTogbnVtYmVyLCBleHBlbnNpdmU6IGJvb2xlYW4gPSBmYWxzZSkge1xuXHRcdHRoaXMubmFtZSA9IG5hbWU7XG5cdFx0dGhpcy52YXJpYWJsZXNSZWZlcmVuY2UgPSByZWZlcmVuY2U7XG5cdFx0dGhpcy5leHBlbnNpdmUgPSBleHBlbnNpdmU7XG5cdH1cbn1cblxuZXhwb3J0IGNsYXNzIFN0YWNrRnJhbWUgaW1wbGVtZW50cyBEZWJ1Z1Byb3RvY29sLlN0YWNrRnJhbWUge1xuXHRpZDogbnVtYmVyO1xuXHRzb3VyY2U6IFNvdXJjZTtcblx0bGluZTogbnVtYmVyO1xuXHRjb2x1bW46IG51bWJlcjtcblx0bmFtZTogc3RyaW5nO1xuXG5cdHB1YmxpYyBjb25zdHJ1Y3RvcihpOiBudW1iZXIsIG5tOiBzdHJpbmcsIHNyYz86IFNvdXJjZSwgbG46IG51bWJlciA9IDAsIGNvbDogbnVtYmVyID0gMCkge1xuXHRcdHRoaXMuaWQgPSBpO1xuXHRcdHRoaXMuc291cmNlID0gc3JjO1xuXHRcdHRoaXMubGluZSA9IGxuO1xuXHRcdHRoaXMuY29sdW1uID0gY29sO1xuXHRcdHRoaXMubmFtZSA9IG5tO1xuXHR9XG59XG5cbmV4cG9ydCBjbGFzcyBUaHJlYWQgaW1wbGVtZW50cyBEZWJ1Z1Byb3RvY29sLlRocmVhZCB7XG5cdGlkOiBudW1iZXI7XG5cdG5hbWU6IHN0cmluZztcblxuXHRwdWJsaWMgY29uc3RydWN0b3IoaWQ6IG51bWJlciwgbmFtZTogc3RyaW5nKSB7XG5cdFx0dGhpcy5pZCA9IGlkO1xuXHRcdGlmIChuYW1lKSB7XG5cdFx0XHR0aGlzLm5hbWUgPSBuYW1lO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aGlzLm5hbWUgPSAnVGhyZWFkICMnICsgaWQ7XG5cdFx0fVxuXHR9XG59XG5cbmV4cG9ydCBjbGFzcyBWYXJpYWJsZSBpbXBsZW1lbnRzIERlYnVnUHJvdG9jb2wuVmFyaWFibGUge1xuXHRuYW1lOiBzdHJpbmc7XG5cdHZhbHVlOiBzdHJpbmc7XG5cdHZhcmlhYmxlc1JlZmVyZW5jZTogbnVtYmVyO1xuXG5cdHB1YmxpYyBjb25zdHJ1Y3RvcihuYW1lOiBzdHJpbmcsIHZhbHVlOiBzdHJpbmcsIHJlZjogbnVtYmVyID0gMCwgaW5kZXhlZFZhcmlhYmxlcz86IG51bWJlciwgbmFtZWRWYXJpYWJsZXM/OiBudW1iZXIpIHtcblx0XHR0aGlzLm5hbWUgPSBuYW1lO1xuXHRcdHRoaXMudmFsdWUgPSB2YWx1ZTtcblx0XHR0aGlzLnZhcmlhYmxlc1JlZmVyZW5jZSA9IHJlZjtcblx0XHRpZiAodHlwZW9mIG5hbWVkVmFyaWFibGVzID09PSAnbnVtYmVyJykge1xuXHRcdFx0KDxEZWJ1Z1Byb3RvY29sLlZhcmlhYmxlPnRoaXMpLm5hbWVkVmFyaWFibGVzID0gbmFtZWRWYXJpYWJsZXM7XG5cdFx0fVxuXHRcdGlmICh0eXBlb2YgaW5kZXhlZFZhcmlhYmxlcyA9PT0gJ251bWJlcicpIHtcblx0XHRcdCg8RGVidWdQcm90b2NvbC5WYXJpYWJsZT50aGlzKS5pbmRleGVkVmFyaWFibGVzID0gaW5kZXhlZFZhcmlhYmxlcztcblx0XHR9XG5cdH1cbn1cblxuZXhwb3J0IGNsYXNzIEJyZWFrcG9pbnQgaW1wbGVtZW50cyBEZWJ1Z1Byb3RvY29sLkJyZWFrcG9pbnQge1xuXHR2ZXJpZmllZDogYm9vbGVhbjtcblxuXHRwdWJsaWMgY29uc3RydWN0b3IodmVyaWZpZWQ6IGJvb2xlYW4sIGxpbmU/OiBudW1iZXIsIGNvbHVtbj86IG51bWJlciwgc291cmNlPzogU291cmNlKSB7XG5cdFx0dGhpcy52ZXJpZmllZCA9IHZlcmlmaWVkO1xuXHRcdGNvbnN0IGU6IERlYnVnUHJvdG9jb2wuQnJlYWtwb2ludCA9IHRoaXM7XG5cdFx0aWYgKHR5cGVvZiBsaW5lID09PSAnbnVtYmVyJykge1xuXHRcdFx0ZS5saW5lID0gbGluZTtcblx0XHR9XG5cdFx0aWYgKHR5cGVvZiBjb2x1bW4gPT09ICdudW1iZXInKSB7XG5cdFx0XHRlLmNvbHVtbiA9IGNvbHVtbjtcblx0XHR9XG5cdFx0aWYgKHNvdXJjZSkge1xuXHRcdFx0ZS5zb3VyY2UgPSBzb3VyY2U7XG5cdFx0fVxuXHR9XG59XG5cbmV4cG9ydCBjbGFzcyBNb2R1bGUgaW1wbGVtZW50cyBEZWJ1Z1Byb3RvY29sLk1vZHVsZSB7XG5cdGlkOiBudW1iZXIgfCBzdHJpbmc7XG5cdG5hbWU6IHN0cmluZztcblxuXHRwdWJsaWMgY29uc3RydWN0b3IoaWQ6IG51bWJlciB8IHN0cmluZywgbmFtZTogc3RyaW5nKSB7XG5cdFx0dGhpcy5pZCA9IGlkO1xuXHRcdHRoaXMubmFtZSA9IG5hbWU7XG5cdH1cbn1cblxuZXhwb3J0IGNsYXNzIENvbXBsZXRpb25JdGVtIGltcGxlbWVudHMgRGVidWdQcm90b2NvbC5Db21wbGV0aW9uSXRlbSB7XG5cdGxhYmVsOiBzdHJpbmc7XG5cdHN0YXJ0OiBudW1iZXI7XG5cdGxlbmd0aDogbnVtYmVyO1xuXG5cdHB1YmxpYyBjb25zdHJ1Y3RvcihsYWJlbDogc3RyaW5nLCBzdGFydDogbnVtYmVyLCBsZW5ndGg6IG51bWJlciA9IDApIHtcblx0XHR0aGlzLmxhYmVsID0gbGFiZWw7XG5cdFx0dGhpcy5zdGFydCA9IHN0YXJ0O1xuXHRcdHRoaXMubGVuZ3RoID0gbGVuZ3RoO1xuXHR9XG59XG5cbmV4cG9ydCBjbGFzcyBTdG9wcGVkRXZlbnQgZXh0ZW5kcyBFdmVudCBpbXBsZW1lbnRzIERlYnVnUHJvdG9jb2wuU3RvcHBlZEV2ZW50IHtcblx0Ym9keToge1xuXHRcdHJlYXNvbjogc3RyaW5nO1xuXHR9O1xuXG5cdHB1YmxpYyBjb25zdHJ1Y3RvcihyZWFzb246IHN0cmluZywgdGhyZWFkSWQ/OiBudW1iZXIsIGV4Y2VwdGlvblRleHQ/OiBzdHJpbmcpIHtcblx0XHRzdXBlcignc3RvcHBlZCcpO1xuXHRcdHRoaXMuYm9keSA9IHtcblx0XHRcdHJlYXNvbjogcmVhc29uXG5cdFx0fTtcblx0XHRpZiAodHlwZW9mIHRocmVhZElkID09PSAnbnVtYmVyJykge1xuXHRcdFx0KHRoaXMgYXMgRGVidWdQcm90b2NvbC5TdG9wcGVkRXZlbnQpLmJvZHkudGhyZWFkSWQgPSB0aHJlYWRJZDtcblx0XHR9XG5cdFx0aWYgKHR5cGVvZiBleGNlcHRpb25UZXh0ID09PSAnc3RyaW5nJykge1xuXHRcdFx0KHRoaXMgYXMgRGVidWdQcm90b2NvbC5TdG9wcGVkRXZlbnQpLmJvZHkudGV4dCA9IGV4Y2VwdGlvblRleHQ7XG5cdFx0fVxuXHR9XG59XG5cbmV4cG9ydCBjbGFzcyBDb250aW51ZWRFdmVudCBleHRlbmRzIEV2ZW50IGltcGxlbWVudHMgRGVidWdQcm90b2NvbC5Db250aW51ZWRFdmVudCB7XG5cdGJvZHk6IHtcblx0XHR0aHJlYWRJZDogbnVtYmVyO1xuXHR9O1xuXG5cdHB1YmxpYyBjb25zdHJ1Y3Rvcih0aHJlYWRJZDogbnVtYmVyLCBhbGxUaHJlYWRzQ29udGludWVkPzogYm9vbGVhbikge1xuXHRcdHN1cGVyKCdjb250aW51ZWQnKTtcblx0XHR0aGlzLmJvZHkgPSB7XG5cdFx0XHR0aHJlYWRJZDogdGhyZWFkSWRcblx0XHR9O1xuXG5cdFx0aWYgKHR5cGVvZiBhbGxUaHJlYWRzQ29udGludWVkID09PSAnYm9vbGVhbicpIHtcblx0XHRcdCg8RGVidWdQcm90b2NvbC5Db250aW51ZWRFdmVudD50aGlzKS5ib2R5LmFsbFRocmVhZHNDb250aW51ZWQgPSBhbGxUaHJlYWRzQ29udGludWVkO1xuXHRcdH1cblx0fVxufVxuXG5leHBvcnQgY2xhc3MgSW5pdGlhbGl6ZWRFdmVudCBleHRlbmRzIEV2ZW50IGltcGxlbWVudHMgRGVidWdQcm90b2NvbC5Jbml0aWFsaXplZEV2ZW50IHtcblx0cHVibGljIGNvbnN0cnVjdG9yKCkge1xuXHRcdHN1cGVyKCdpbml0aWFsaXplZCcpO1xuXHR9XG59XG5cbmV4cG9ydCBjbGFzcyBUZXJtaW5hdGVkRXZlbnQgZXh0ZW5kcyBFdmVudCBpbXBsZW1lbnRzIERlYnVnUHJvdG9jb2wuVGVybWluYXRlZEV2ZW50IHtcblx0cHVibGljIGNvbnN0cnVjdG9yKHJlc3RhcnQ/OiBhbnkpIHtcblx0XHRzdXBlcigndGVybWluYXRlZCcpO1xuXHRcdGlmICh0eXBlb2YgcmVzdGFydCA9PT0gJ2Jvb2xlYW4nIHx8IHJlc3RhcnQpIHtcblx0XHRcdGNvbnN0IGU6IERlYnVnUHJvdG9jb2wuVGVybWluYXRlZEV2ZW50ID0gdGhpcztcblx0XHRcdGUuYm9keSA9IHtcblx0XHRcdFx0cmVzdGFydDogcmVzdGFydFxuXHRcdFx0fTtcblx0XHR9XG5cdH1cbn1cblxuZXhwb3J0IGNsYXNzIE91dHB1dEV2ZW50IGV4dGVuZHMgRXZlbnQgaW1wbGVtZW50cyBEZWJ1Z1Byb3RvY29sLk91dHB1dEV2ZW50IHtcblx0Ym9keToge1xuXHRcdGNhdGVnb3J5OiBzdHJpbmcsXG5cdFx0b3V0cHV0OiBzdHJpbmcsXG5cdFx0ZGF0YT86IGFueVxuXHR9O1xuXG5cdHB1YmxpYyBjb25zdHJ1Y3RvcihvdXRwdXQ6IHN0cmluZywgY2F0ZWdvcnk6IHN0cmluZyA9ICdjb25zb2xlJywgZGF0YT86IGFueSkge1xuXHRcdHN1cGVyKCdvdXRwdXQnKTtcblx0XHR0aGlzLmJvZHkgPSB7XG5cdFx0XHRjYXRlZ29yeTogY2F0ZWdvcnksXG5cdFx0XHRvdXRwdXQ6IG91dHB1dFxuXHRcdH07XG5cdFx0aWYgKGRhdGEgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0dGhpcy5ib2R5LmRhdGEgPSBkYXRhO1xuXHRcdH1cblx0fVxufVxuXG5leHBvcnQgY2xhc3MgVGhyZWFkRXZlbnQgZXh0ZW5kcyBFdmVudCBpbXBsZW1lbnRzIERlYnVnUHJvdG9jb2wuVGhyZWFkRXZlbnQge1xuXHRib2R5OiB7XG5cdFx0cmVhc29uOiBzdHJpbmcsXG5cdFx0dGhyZWFkSWQ6IG51bWJlclxuXHR9O1xuXG5cdHB1YmxpYyBjb25zdHJ1Y3RvcihyZWFzb246IHN0cmluZywgdGhyZWFkSWQ6IG51bWJlcikge1xuXHRcdHN1cGVyKCd0aHJlYWQnKTtcblx0XHR0aGlzLmJvZHkgPSB7XG5cdFx0XHRyZWFzb246IHJlYXNvbixcblx0XHRcdHRocmVhZElkOiB0aHJlYWRJZFxuXHRcdH07XG5cdH1cbn1cblxuZXhwb3J0IGNsYXNzIEJyZWFrcG9pbnRFdmVudCBleHRlbmRzIEV2ZW50IGltcGxlbWVudHMgRGVidWdQcm90b2NvbC5CcmVha3BvaW50RXZlbnQge1xuXHRib2R5OiB7XG5cdFx0cmVhc29uOiBzdHJpbmcsXG5cdFx0YnJlYWtwb2ludDogQnJlYWtwb2ludFxuXHR9O1xuXG5cdHB1YmxpYyBjb25zdHJ1Y3RvcihyZWFzb246IHN0cmluZywgYnJlYWtwb2ludDogQnJlYWtwb2ludCkge1xuXHRcdHN1cGVyKCdicmVha3BvaW50Jyk7XG5cdFx0dGhpcy5ib2R5ID0ge1xuXHRcdFx0cmVhc29uOiByZWFzb24sXG5cdFx0XHRicmVha3BvaW50OiBicmVha3BvaW50XG5cdFx0fTtcblx0fVxufVxuXG5leHBvcnQgY2xhc3MgTW9kdWxlRXZlbnQgZXh0ZW5kcyBFdmVudCBpbXBsZW1lbnRzIERlYnVnUHJvdG9jb2wuTW9kdWxlRXZlbnQge1xuXHRib2R5OiB7XG5cdFx0cmVhc29uOiAnbmV3JyB8ICdjaGFuZ2VkJyB8ICdyZW1vdmVkJyxcblx0XHRtb2R1bGU6IE1vZHVsZVxuXHR9O1xuXG5cdHB1YmxpYyBjb25zdHJ1Y3RvcihyZWFzb246ICduZXcnIHwgJ2NoYW5nZWQnIHwgJ3JlbW92ZWQnLCBtb2R1bGU6IE1vZHVsZSkge1xuXHRcdHN1cGVyKCdtb2R1bGUnKTtcblx0XHR0aGlzLmJvZHkgPSB7XG5cdFx0XHRyZWFzb246IHJlYXNvbixcblx0XHRcdG1vZHVsZTogbW9kdWxlXG5cdFx0fTtcblx0fVxufVxuXG5leHBvcnQgY2xhc3MgTG9hZGVkU291cmNlRXZlbnQgZXh0ZW5kcyBFdmVudCBpbXBsZW1lbnRzIERlYnVnUHJvdG9jb2wuTG9hZGVkU291cmNlRXZlbnQge1xuXHRib2R5OiB7XG5cdFx0cmVhc29uOiAnbmV3JyB8ICdjaGFuZ2VkJyB8ICdyZW1vdmVkJyxcblx0XHRzb3VyY2U6IFNvdXJjZVxuXHR9O1xuXG5cdHB1YmxpYyBjb25zdHJ1Y3RvcihyZWFzb246ICduZXcnIHwgJ2NoYW5nZWQnIHwgJ3JlbW92ZWQnLCBzb3VyY2U6IFNvdXJjZSkge1xuXHRcdHN1cGVyKCdsb2FkZWRTb3VyY2UnKTtcblx0XHR0aGlzLmJvZHkgPSB7XG5cdFx0XHRyZWFzb246IHJlYXNvbixcblx0XHRcdHNvdXJjZTogc291cmNlXG5cdFx0fTtcblx0fVxufVxuXG5leHBvcnQgY2xhc3MgQ2FwYWJpbGl0aWVzRXZlbnQgZXh0ZW5kcyBFdmVudCBpbXBsZW1lbnRzIERlYnVnUHJvdG9jb2wuQ2FwYWJpbGl0aWVzRXZlbnQge1xuXHRib2R5OiB7XG5cdFx0Y2FwYWJpbGl0aWVzOiBEZWJ1Z1Byb3RvY29sLkNhcGFiaWxpdGllc1xuXHR9O1xuXG5cdHB1YmxpYyBjb25zdHJ1Y3RvcihjYXBhYmlsaXRpZXM6IERlYnVnUHJvdG9jb2wuQ2FwYWJpbGl0aWVzKSB7XG5cdFx0c3VwZXIoJ2NhcGFiaWxpdGllcycpO1xuXHRcdHRoaXMuYm9keSA9IHtcblx0XHRcdGNhcGFiaWxpdGllczogY2FwYWJpbGl0aWVzXG5cdFx0fTtcblx0fVxufVxuXG5leHBvcnQgY2xhc3MgUHJvZ3Jlc3NTdGFydEV2ZW50IGV4dGVuZHMgRXZlbnQgaW1wbGVtZW50cyBEZWJ1Z1Byb3RvY29sLlByb2dyZXNzU3RhcnRFdmVudCB7XG5cdGJvZHk6IHtcblx0XHRwcm9ncmVzc0lkOiBzdHJpbmcsXG5cdFx0dGl0bGU6IHN0cmluZ1xuXHR9O1xuXG5cdHB1YmxpYyBjb25zdHJ1Y3Rvcihwcm9ncmVzc0lkOiBzdHJpbmcsIHRpdGxlOiBzdHJpbmcsIG1lc3NhZ2U/OiBzdHJpbmcpIHtcblx0XHRzdXBlcigncHJvZ3Jlc3NTdGFydCcpO1xuXHRcdHRoaXMuYm9keSA9IHtcblx0XHRcdHByb2dyZXNzSWQ6IHByb2dyZXNzSWQsXG5cdFx0XHR0aXRsZTogdGl0bGVcblx0XHR9O1xuXHRcdGlmICh0eXBlb2YgbWVzc2FnZSA9PT0gJ3N0cmluZycpIHtcblx0XHRcdCh0aGlzIGFzIERlYnVnUHJvdG9jb2wuUHJvZ3Jlc3NTdGFydEV2ZW50KS5ib2R5Lm1lc3NhZ2UgPSBtZXNzYWdlO1xuXHRcdH1cblx0fVxufVxuXG5leHBvcnQgY2xhc3MgUHJvZ3Jlc3NVcGRhdGVFdmVudCBleHRlbmRzIEV2ZW50IGltcGxlbWVudHMgRGVidWdQcm90b2NvbC5Qcm9ncmVzc1VwZGF0ZUV2ZW50IHtcblx0Ym9keToge1xuXHRcdHByb2dyZXNzSWQ6IHN0cmluZ1xuXHR9O1xuXG5cdHB1YmxpYyBjb25zdHJ1Y3Rvcihwcm9ncmVzc0lkOiBzdHJpbmcsIG1lc3NhZ2U/OiBzdHJpbmcpIHtcblx0XHRzdXBlcigncHJvZ3Jlc3NVcGRhdGUnKTtcblx0XHR0aGlzLmJvZHkgPSB7XG5cdFx0XHRwcm9ncmVzc0lkOiBwcm9ncmVzc0lkXG5cdFx0fTtcblx0XHRpZiAodHlwZW9mIG1lc3NhZ2UgPT09ICdzdHJpbmcnKSB7XG5cdFx0XHQodGhpcyBhcyBEZWJ1Z1Byb3RvY29sLlByb2dyZXNzVXBkYXRlRXZlbnQpLmJvZHkubWVzc2FnZSA9IG1lc3NhZ2U7XG5cdFx0fVxuXHR9XG59XG5cbmV4cG9ydCBjbGFzcyBQcm9ncmVzc0VuZEV2ZW50IGV4dGVuZHMgRXZlbnQgaW1wbGVtZW50cyBEZWJ1Z1Byb3RvY29sLlByb2dyZXNzRW5kRXZlbnQge1xuXHRib2R5OiB7XG5cdFx0cHJvZ3Jlc3NJZDogc3RyaW5nXG5cdH07XG5cblx0cHVibGljIGNvbnN0cnVjdG9yKHByb2dyZXNzSWQ6IHN0cmluZywgbWVzc2FnZT86IHN0cmluZykge1xuXHRcdHN1cGVyKCdwcm9ncmVzc0VuZCcpO1xuXHRcdHRoaXMuYm9keSA9IHtcblx0XHRcdHByb2dyZXNzSWQ6IHByb2dyZXNzSWRcblx0XHR9O1xuXHRcdGlmICh0eXBlb2YgbWVzc2FnZSA9PT0gJ3N0cmluZycpIHtcblx0XHRcdCh0aGlzIGFzIERlYnVnUHJvdG9jb2wuUHJvZ3Jlc3NFbmRFdmVudCkuYm9keS5tZXNzYWdlID0gbWVzc2FnZTtcblx0XHR9XG5cdH1cbn1cblxuZXhwb3J0IGNsYXNzIEludmFsaWRhdGVkRXZlbnQgZXh0ZW5kcyBFdmVudCBpbXBsZW1lbnRzIERlYnVnUHJvdG9jb2wuSW52YWxpZGF0ZWRFdmVudCB7XG5cdGJvZHk6IHtcblx0XHRhcmVhcz86IERlYnVnUHJvdG9jb2wuSW52YWxpZGF0ZWRBcmVhc1tdO1xuXHRcdHRocmVhZElkPzogbnVtYmVyO1xuXHRcdHN0YWNrRnJhbWVJZD86IG51bWJlcjtcblx0fTtcblxuXHRwdWJsaWMgY29uc3RydWN0b3IoYXJlYXM/OiBEZWJ1Z1Byb3RvY29sLkludmFsaWRhdGVkQXJlYXNbXSwgdGhyZWFkSWQ/OiBudW1iZXIsIHN0YWNrRnJhbWVJZD86IG51bWJlcikge1xuXHRcdHN1cGVyKCdpbnZhbGlkYXRlZCcpO1xuXHRcdHRoaXMuYm9keSA9IHtcblx0XHR9O1xuXHRcdGlmIChhcmVhcykge1xuXHRcdFx0dGhpcy5ib2R5LmFyZWFzID0gYXJlYXM7XG5cdFx0fVxuXHRcdGlmICh0aHJlYWRJZCkge1xuXHRcdFx0dGhpcy5ib2R5LnRocmVhZElkID0gdGhyZWFkSWQ7XG5cdFx0fVxuXHRcdGlmIChzdGFja0ZyYW1lSWQpIHtcblx0XHRcdHRoaXMuYm9keS5zdGFja0ZyYW1lSWQgPSBzdGFja0ZyYW1lSWQ7XG5cdFx0fVxuXHR9XG59XG5cbmV4cG9ydCBlbnVtIEVycm9yRGVzdGluYXRpb24ge1xuXHRVc2VyID0gMSxcblx0VGVsZW1ldHJ5ID0gMlxufTtcblxuZXhwb3J0IGNsYXNzIERlYnVnU2Vzc2lvbiBleHRlbmRzIFByb3RvY29sU2VydmVyIHtcblxuXHRwcml2YXRlIF9kZWJ1Z2dlckxpbmVzU3RhcnRBdDE6IGJvb2xlYW47XG5cdHByaXZhdGUgX2RlYnVnZ2VyQ29sdW1uc1N0YXJ0QXQxOiBib29sZWFuO1xuXHRwcml2YXRlIF9kZWJ1Z2dlclBhdGhzQXJlVVJJczogYm9vbGVhbjtcblxuXHRwcml2YXRlIF9jbGllbnRMaW5lc1N0YXJ0QXQxOiBib29sZWFuO1xuXHRwcml2YXRlIF9jbGllbnRDb2x1bW5zU3RhcnRBdDE6IGJvb2xlYW47XG5cdHByaXZhdGUgX2NsaWVudFBhdGhzQXJlVVJJczogYm9vbGVhbjtcblxuXHRwcm90ZWN0ZWQgX2lzU2VydmVyOiBib29sZWFuO1xuXG5cdHB1YmxpYyBjb25zdHJ1Y3RvcihvYnNvbGV0ZV9kZWJ1Z2dlckxpbmVzQW5kQ29sdW1uc1N0YXJ0QXQxPzogYm9vbGVhbiwgb2Jzb2xldGVfaXNTZXJ2ZXI/OiBib29sZWFuKSB7XG5cdFx0c3VwZXIoKTtcblxuXHRcdGNvbnN0IGxpbmVzQW5kQ29sdW1uc1N0YXJ0QXQxID0gdHlwZW9mIG9ic29sZXRlX2RlYnVnZ2VyTGluZXNBbmRDb2x1bW5zU3RhcnRBdDEgPT09ICdib29sZWFuJyA/IG9ic29sZXRlX2RlYnVnZ2VyTGluZXNBbmRDb2x1bW5zU3RhcnRBdDEgOiBmYWxzZTtcblx0XHR0aGlzLl9kZWJ1Z2dlckxpbmVzU3RhcnRBdDEgPSBsaW5lc0FuZENvbHVtbnNTdGFydEF0MTtcblx0XHR0aGlzLl9kZWJ1Z2dlckNvbHVtbnNTdGFydEF0MSA9IGxpbmVzQW5kQ29sdW1uc1N0YXJ0QXQxO1xuXHRcdHRoaXMuX2RlYnVnZ2VyUGF0aHNBcmVVUklzID0gZmFsc2U7XG5cblx0XHR0aGlzLl9jbGllbnRMaW5lc1N0YXJ0QXQxID0gdHJ1ZTtcblx0XHR0aGlzLl9jbGllbnRDb2x1bW5zU3RhcnRBdDEgPSB0cnVlO1xuXHRcdHRoaXMuX2NsaWVudFBhdGhzQXJlVVJJcyA9IGZhbHNlO1xuXG5cdFx0dGhpcy5faXNTZXJ2ZXIgPSB0eXBlb2Ygb2Jzb2xldGVfaXNTZXJ2ZXIgPT09ICdib29sZWFuJyA/IG9ic29sZXRlX2lzU2VydmVyIDogZmFsc2U7XG5cblx0XHR0aGlzLm9uKCdjbG9zZScsICgpID0+IHtcblx0XHRcdHRoaXMuc2h1dGRvd24oKTtcblx0XHR9KTtcblx0XHR0aGlzLm9uKCdlcnJvcicsIChlcnJvcikgPT4ge1xuXHRcdFx0dGhpcy5zaHV0ZG93bigpO1xuXHRcdH0pO1xuXHR9XG5cblx0cHVibGljIHNldERlYnVnZ2VyUGF0aEZvcm1hdChmb3JtYXQ6IHN0cmluZykge1xuXHRcdHRoaXMuX2RlYnVnZ2VyUGF0aHNBcmVVUklzID0gZm9ybWF0ICE9PSAncGF0aCc7XG5cdH1cblxuXHRwdWJsaWMgc2V0RGVidWdnZXJMaW5lc1N0YXJ0QXQxKGVuYWJsZTogYm9vbGVhbikge1xuXHRcdHRoaXMuX2RlYnVnZ2VyTGluZXNTdGFydEF0MSA9IGVuYWJsZTtcblx0fVxuXG5cdHB1YmxpYyBzZXREZWJ1Z2dlckNvbHVtbnNTdGFydEF0MShlbmFibGU6IGJvb2xlYW4pIHtcblx0XHR0aGlzLl9kZWJ1Z2dlckNvbHVtbnNTdGFydEF0MSA9IGVuYWJsZTtcblx0fVxuXG5cdHB1YmxpYyBzZXRSdW5Bc1NlcnZlcihlbmFibGU6IGJvb2xlYW4pIHtcblx0XHR0aGlzLl9pc1NlcnZlciA9IGVuYWJsZTtcblx0fVxuXG5cdC8qKlxuXHQgKiBBIHZpcnR1YWwgY29uc3RydWN0b3IuLi5cblx0ICovXG5cdHB1YmxpYyBzdGF0aWMgcnVuKGRlYnVnU2Vzc2lvbjogdHlwZW9mIERlYnVnU2Vzc2lvbikge1xuXHRcdHJ1bkRlYnVnQWRhcHRlcihkZWJ1Z1Nlc3Npb24pO1xuXHR9XG5cblx0cHVibGljIHNodXRkb3duKCk6IHZvaWQge1xuXHRcdGlmICh0aGlzLl9pc1NlcnZlciB8fCB0aGlzLl9pc1J1bm5pbmdJbmxpbmUoKSkge1xuXHRcdFx0Ly8gc2h1dGRvd24gaWdub3JlZCBpbiBzZXJ2ZXIgbW9kZVxuXHRcdH0gZWxzZSB7XG5cdFx0XHQvLyB3YWl0IGEgYml0IGJlZm9yZSBzaHV0dGluZyBkb3duXG5cdFx0XHRzZXRUaW1lb3V0KCgpID0+IHtcblx0XHRcdFx0cHJvY2Vzcy5leGl0KDApO1xuXHRcdFx0fSwgMTAwKTtcblx0XHR9XG5cdH1cblxuXHRwcm90ZWN0ZWQgc2VuZEVycm9yUmVzcG9uc2UocmVzcG9uc2U6IERlYnVnUHJvdG9jb2wuUmVzcG9uc2UsIGNvZGVPck1lc3NhZ2U6IG51bWJlciB8IERlYnVnUHJvdG9jb2wuTWVzc2FnZSwgZm9ybWF0Pzogc3RyaW5nLCB2YXJpYWJsZXM/OiBhbnksIGRlc3Q6IEVycm9yRGVzdGluYXRpb24gPSBFcnJvckRlc3RpbmF0aW9uLlVzZXIpOiB2b2lkIHtcblxuXHRcdGxldCBtc2cgOiBEZWJ1Z1Byb3RvY29sLk1lc3NhZ2U7XG5cdFx0aWYgKHR5cGVvZiBjb2RlT3JNZXNzYWdlID09PSAnbnVtYmVyJykge1xuXHRcdFx0bXNnID0gPERlYnVnUHJvdG9jb2wuTWVzc2FnZT4ge1xuXHRcdFx0XHRpZDogPG51bWJlcj4gY29kZU9yTWVzc2FnZSxcblx0XHRcdFx0Zm9ybWF0OiBmb3JtYXRcblx0XHRcdH07XG5cdFx0XHRpZiAodmFyaWFibGVzKSB7XG5cdFx0XHRcdG1zZy52YXJpYWJsZXMgPSB2YXJpYWJsZXM7XG5cdFx0XHR9XG5cdFx0XHRpZiAoZGVzdCAmIEVycm9yRGVzdGluYXRpb24uVXNlcikge1xuXHRcdFx0XHRtc2cuc2hvd1VzZXIgPSB0cnVlO1xuXHRcdFx0fVxuXHRcdFx0aWYgKGRlc3QgJiBFcnJvckRlc3RpbmF0aW9uLlRlbGVtZXRyeSkge1xuXHRcdFx0XHRtc2cuc2VuZFRlbGVtZXRyeSA9IHRydWU7XG5cdFx0XHR9XG5cdFx0fSBlbHNlIHtcblx0XHRcdG1zZyA9IGNvZGVPck1lc3NhZ2U7XG5cdFx0fVxuXG5cdFx0cmVzcG9uc2Uuc3VjY2VzcyA9IGZhbHNlO1xuXHRcdHJlc3BvbnNlLm1lc3NhZ2UgPSBEZWJ1Z1Nlc3Npb24uZm9ybWF0UElJKG1zZy5mb3JtYXQsIHRydWUsIG1zZy52YXJpYWJsZXMpO1xuXHRcdGlmICghcmVzcG9uc2UuYm9keSkge1xuXHRcdFx0cmVzcG9uc2UuYm9keSA9IHsgfTtcblx0XHR9XG5cdFx0cmVzcG9uc2UuYm9keS5lcnJvciA9IG1zZztcblxuXHRcdHRoaXMuc2VuZFJlc3BvbnNlKHJlc3BvbnNlKTtcblx0fVxuXG5cdHB1YmxpYyBydW5JblRlcm1pbmFsUmVxdWVzdChhcmdzOiBEZWJ1Z1Byb3RvY29sLlJ1bkluVGVybWluYWxSZXF1ZXN0QXJndW1lbnRzLCB0aW1lb3V0OiBudW1iZXIsIGNiOiAocmVzcG9uc2U6IERlYnVnUHJvdG9jb2wuUnVuSW5UZXJtaW5hbFJlc3BvbnNlKSA9PiB2b2lkKSB7XG5cdFx0dGhpcy5zZW5kUmVxdWVzdCgncnVuSW5UZXJtaW5hbCcsIGFyZ3MsIHRpbWVvdXQsIGNiKTtcblx0fVxuXG5cdHByb3RlY3RlZCBkaXNwYXRjaFJlcXVlc3QocmVxdWVzdDogRGVidWdQcm90b2NvbC5SZXF1ZXN0KTogdm9pZCB7XG5cblx0XHRjb25zdCByZXNwb25zZSA9IG5ldyBSZXNwb25zZShyZXF1ZXN0KTtcblxuXHRcdHRyeSB7XG5cdFx0XHRpZiAocmVxdWVzdC5jb21tYW5kID09PSAnaW5pdGlhbGl6ZScpIHtcblx0XHRcdFx0dmFyIGFyZ3MgPSA8RGVidWdQcm90b2NvbC5Jbml0aWFsaXplUmVxdWVzdEFyZ3VtZW50cz4gcmVxdWVzdC5hcmd1bWVudHM7XG5cblx0XHRcdFx0aWYgKHR5cGVvZiBhcmdzLmxpbmVzU3RhcnRBdDEgPT09ICdib29sZWFuJykge1xuXHRcdFx0XHRcdHRoaXMuX2NsaWVudExpbmVzU3RhcnRBdDEgPSBhcmdzLmxpbmVzU3RhcnRBdDE7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKHR5cGVvZiBhcmdzLmNvbHVtbnNTdGFydEF0MSA9PT0gJ2Jvb2xlYW4nKSB7XG5cdFx0XHRcdFx0dGhpcy5fY2xpZW50Q29sdW1uc1N0YXJ0QXQxID0gYXJncy5jb2x1bW5zU3RhcnRBdDE7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAoYXJncy5wYXRoRm9ybWF0ICE9PSAncGF0aCcpIHtcblx0XHRcdFx0XHR0aGlzLnNlbmRFcnJvclJlc3BvbnNlKHJlc3BvbnNlLCAyMDE4LCAnZGVidWcgYWRhcHRlciBvbmx5IHN1cHBvcnRzIG5hdGl2ZSBwYXRocycsIG51bGwsIEVycm9yRGVzdGluYXRpb24uVGVsZW1ldHJ5KTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRjb25zdCBpbml0aWFsaXplUmVzcG9uc2UgPSA8RGVidWdQcm90b2NvbC5Jbml0aWFsaXplUmVzcG9uc2U+IHJlc3BvbnNlO1xuXHRcdFx0XHRcdGluaXRpYWxpemVSZXNwb25zZS5ib2R5ID0ge307XG5cdFx0XHRcdFx0dGhpcy5pbml0aWFsaXplUmVxdWVzdChpbml0aWFsaXplUmVzcG9uc2UsIGFyZ3MpO1xuXHRcdFx0XHR9XG5cblx0XHRcdH0gZWxzZSBpZiAocmVxdWVzdC5jb21tYW5kID09PSAnbGF1bmNoJykge1xuXHRcdFx0XHR0aGlzLmxhdW5jaFJlcXVlc3QoPERlYnVnUHJvdG9jb2wuTGF1bmNoUmVzcG9uc2U+IHJlc3BvbnNlLCByZXF1ZXN0LmFyZ3VtZW50cywgcmVxdWVzdCk7XG5cblx0XHRcdH0gZWxzZSBpZiAocmVxdWVzdC5jb21tYW5kID09PSAnYXR0YWNoJykge1xuXHRcdFx0XHR0aGlzLmF0dGFjaFJlcXVlc3QoPERlYnVnUHJvdG9jb2wuQXR0YWNoUmVzcG9uc2U+IHJlc3BvbnNlLCByZXF1ZXN0LmFyZ3VtZW50cywgcmVxdWVzdCk7XG5cblx0XHRcdH0gZWxzZSBpZiAocmVxdWVzdC5jb21tYW5kID09PSAnZGlzY29ubmVjdCcpIHtcblx0XHRcdFx0dGhpcy5kaXNjb25uZWN0UmVxdWVzdCg8RGVidWdQcm90b2NvbC5EaXNjb25uZWN0UmVzcG9uc2U+IHJlc3BvbnNlLCByZXF1ZXN0LmFyZ3VtZW50cywgcmVxdWVzdCk7XG5cblx0XHRcdH0gZWxzZSBpZiAocmVxdWVzdC5jb21tYW5kID09PSAndGVybWluYXRlJykge1xuXHRcdFx0XHR0aGlzLnRlcm1pbmF0ZVJlcXVlc3QoPERlYnVnUHJvdG9jb2wuVGVybWluYXRlUmVzcG9uc2U+IHJlc3BvbnNlLCByZXF1ZXN0LmFyZ3VtZW50cywgcmVxdWVzdCk7XG5cblx0XHRcdH0gZWxzZSBpZiAocmVxdWVzdC5jb21tYW5kID09PSAncmVzdGFydCcpIHtcblx0XHRcdFx0dGhpcy5yZXN0YXJ0UmVxdWVzdCg8RGVidWdQcm90b2NvbC5SZXN0YXJ0UmVzcG9uc2U+IHJlc3BvbnNlLCByZXF1ZXN0LmFyZ3VtZW50cywgcmVxdWVzdCk7XG5cblx0XHRcdH0gZWxzZSBpZiAocmVxdWVzdC5jb21tYW5kID09PSAnc2V0QnJlYWtwb2ludHMnKSB7XG5cdFx0XHRcdHRoaXMuc2V0QnJlYWtQb2ludHNSZXF1ZXN0KDxEZWJ1Z1Byb3RvY29sLlNldEJyZWFrcG9pbnRzUmVzcG9uc2U+IHJlc3BvbnNlLCByZXF1ZXN0LmFyZ3VtZW50cywgcmVxdWVzdCk7XG5cblx0XHRcdH0gZWxzZSBpZiAocmVxdWVzdC5jb21tYW5kID09PSAnc2V0RnVuY3Rpb25CcmVha3BvaW50cycpIHtcblx0XHRcdFx0dGhpcy5zZXRGdW5jdGlvbkJyZWFrUG9pbnRzUmVxdWVzdCg8RGVidWdQcm90b2NvbC5TZXRGdW5jdGlvbkJyZWFrcG9pbnRzUmVzcG9uc2U+IHJlc3BvbnNlLCByZXF1ZXN0LmFyZ3VtZW50cywgcmVxdWVzdCk7XG5cblx0XHRcdH0gZWxzZSBpZiAocmVxdWVzdC5jb21tYW5kID09PSAnc2V0RXhjZXB0aW9uQnJlYWtwb2ludHMnKSB7XG5cdFx0XHRcdHRoaXMuc2V0RXhjZXB0aW9uQnJlYWtQb2ludHNSZXF1ZXN0KDxEZWJ1Z1Byb3RvY29sLlNldEV4Y2VwdGlvbkJyZWFrcG9pbnRzUmVzcG9uc2U+IHJlc3BvbnNlLCByZXF1ZXN0LmFyZ3VtZW50cywgcmVxdWVzdCk7XG5cblx0XHRcdH0gZWxzZSBpZiAocmVxdWVzdC5jb21tYW5kID09PSAnY29uZmlndXJhdGlvbkRvbmUnKSB7XG5cdFx0XHRcdHRoaXMuY29uZmlndXJhdGlvbkRvbmVSZXF1ZXN0KDxEZWJ1Z1Byb3RvY29sLkNvbmZpZ3VyYXRpb25Eb25lUmVzcG9uc2U+IHJlc3BvbnNlLCByZXF1ZXN0LmFyZ3VtZW50cywgcmVxdWVzdCk7XG5cblx0XHRcdH0gZWxzZSBpZiAocmVxdWVzdC5jb21tYW5kID09PSAnY29udGludWUnKSB7XG5cdFx0XHRcdHRoaXMuY29udGludWVSZXF1ZXN0KDxEZWJ1Z1Byb3RvY29sLkNvbnRpbnVlUmVzcG9uc2U+IHJlc3BvbnNlLCByZXF1ZXN0LmFyZ3VtZW50cywgcmVxdWVzdCk7XG5cblx0XHRcdH0gZWxzZSBpZiAocmVxdWVzdC5jb21tYW5kID09PSAnbmV4dCcpIHtcblx0XHRcdFx0dGhpcy5uZXh0UmVxdWVzdCg8RGVidWdQcm90b2NvbC5OZXh0UmVzcG9uc2U+IHJlc3BvbnNlLCByZXF1ZXN0LmFyZ3VtZW50cywgcmVxdWVzdCk7XG5cblx0XHRcdH0gZWxzZSBpZiAocmVxdWVzdC5jb21tYW5kID09PSAnc3RlcEluJykge1xuXHRcdFx0XHR0aGlzLnN0ZXBJblJlcXVlc3QoPERlYnVnUHJvdG9jb2wuU3RlcEluUmVzcG9uc2U+IHJlc3BvbnNlLCByZXF1ZXN0LmFyZ3VtZW50cywgcmVxdWVzdCk7XG5cblx0XHRcdH0gZWxzZSBpZiAocmVxdWVzdC5jb21tYW5kID09PSAnc3RlcE91dCcpIHtcblx0XHRcdFx0dGhpcy5zdGVwT3V0UmVxdWVzdCg8RGVidWdQcm90b2NvbC5TdGVwT3V0UmVzcG9uc2U+IHJlc3BvbnNlLCByZXF1ZXN0LmFyZ3VtZW50cywgcmVxdWVzdCk7XG5cblx0XHRcdH0gZWxzZSBpZiAocmVxdWVzdC5jb21tYW5kID09PSAnc3RlcEJhY2snKSB7XG5cdFx0XHRcdHRoaXMuc3RlcEJhY2tSZXF1ZXN0KDxEZWJ1Z1Byb3RvY29sLlN0ZXBCYWNrUmVzcG9uc2U+IHJlc3BvbnNlLCByZXF1ZXN0LmFyZ3VtZW50cywgcmVxdWVzdCk7XG5cblx0XHRcdH0gZWxzZSBpZiAocmVxdWVzdC5jb21tYW5kID09PSAncmV2ZXJzZUNvbnRpbnVlJykge1xuXHRcdFx0XHR0aGlzLnJldmVyc2VDb250aW51ZVJlcXVlc3QoPERlYnVnUHJvdG9jb2wuUmV2ZXJzZUNvbnRpbnVlUmVzcG9uc2U+IHJlc3BvbnNlLCByZXF1ZXN0LmFyZ3VtZW50cywgcmVxdWVzdCk7XG5cblx0XHRcdH0gZWxzZSBpZiAocmVxdWVzdC5jb21tYW5kID09PSAncmVzdGFydEZyYW1lJykge1xuXHRcdFx0XHR0aGlzLnJlc3RhcnRGcmFtZVJlcXVlc3QoPERlYnVnUHJvdG9jb2wuUmVzdGFydEZyYW1lUmVzcG9uc2U+IHJlc3BvbnNlLCByZXF1ZXN0LmFyZ3VtZW50cywgcmVxdWVzdCk7XG5cblx0XHRcdH0gZWxzZSBpZiAocmVxdWVzdC5jb21tYW5kID09PSAnZ290bycpIHtcblx0XHRcdFx0dGhpcy5nb3RvUmVxdWVzdCg8RGVidWdQcm90b2NvbC5Hb3RvUmVzcG9uc2U+IHJlc3BvbnNlLCByZXF1ZXN0LmFyZ3VtZW50cywgcmVxdWVzdCk7XG5cblx0XHRcdH0gZWxzZSBpZiAocmVxdWVzdC5jb21tYW5kID09PSAncGF1c2UnKSB7XG5cdFx0XHRcdHRoaXMucGF1c2VSZXF1ZXN0KDxEZWJ1Z1Byb3RvY29sLlBhdXNlUmVzcG9uc2U+IHJlc3BvbnNlLCByZXF1ZXN0LmFyZ3VtZW50cywgcmVxdWVzdCk7XG5cblx0XHRcdH0gZWxzZSBpZiAocmVxdWVzdC5jb21tYW5kID09PSAnc3RhY2tUcmFjZScpIHtcblx0XHRcdFx0dGhpcy5zdGFja1RyYWNlUmVxdWVzdCg8RGVidWdQcm90b2NvbC5TdGFja1RyYWNlUmVzcG9uc2U+IHJlc3BvbnNlLCByZXF1ZXN0LmFyZ3VtZW50cywgcmVxdWVzdCk7XG5cblx0XHRcdH0gZWxzZSBpZiAocmVxdWVzdC5jb21tYW5kID09PSAnc2NvcGVzJykge1xuXHRcdFx0XHR0aGlzLnNjb3Blc1JlcXVlc3QoPERlYnVnUHJvdG9jb2wuU2NvcGVzUmVzcG9uc2U+IHJlc3BvbnNlLCByZXF1ZXN0LmFyZ3VtZW50cywgcmVxdWVzdCk7XG5cblx0XHRcdH0gZWxzZSBpZiAocmVxdWVzdC5jb21tYW5kID09PSAndmFyaWFibGVzJykge1xuXHRcdFx0XHR0aGlzLnZhcmlhYmxlc1JlcXVlc3QoPERlYnVnUHJvdG9jb2wuVmFyaWFibGVzUmVzcG9uc2U+IHJlc3BvbnNlLCByZXF1ZXN0LmFyZ3VtZW50cywgcmVxdWVzdCk7XG5cblx0XHRcdH0gZWxzZSBpZiAocmVxdWVzdC5jb21tYW5kID09PSAnc2V0VmFyaWFibGUnKSB7XG5cdFx0XHRcdHRoaXMuc2V0VmFyaWFibGVSZXF1ZXN0KDxEZWJ1Z1Byb3RvY29sLlNldFZhcmlhYmxlUmVzcG9uc2U+IHJlc3BvbnNlLCByZXF1ZXN0LmFyZ3VtZW50cywgcmVxdWVzdCk7XG5cblx0XHRcdH0gZWxzZSBpZiAocmVxdWVzdC5jb21tYW5kID09PSAnc2V0RXhwcmVzc2lvbicpIHtcblx0XHRcdFx0dGhpcy5zZXRFeHByZXNzaW9uUmVxdWVzdCg8RGVidWdQcm90b2NvbC5TZXRFeHByZXNzaW9uUmVzcG9uc2U+IHJlc3BvbnNlLCByZXF1ZXN0LmFyZ3VtZW50cywgcmVxdWVzdCk7XG5cblx0XHRcdH0gZWxzZSBpZiAocmVxdWVzdC5jb21tYW5kID09PSAnc291cmNlJykge1xuXHRcdFx0XHR0aGlzLnNvdXJjZVJlcXVlc3QoPERlYnVnUHJvdG9jb2wuU291cmNlUmVzcG9uc2U+IHJlc3BvbnNlLCByZXF1ZXN0LmFyZ3VtZW50cywgcmVxdWVzdCk7XG5cblx0XHRcdH0gZWxzZSBpZiAocmVxdWVzdC5jb21tYW5kID09PSAndGhyZWFkcycpIHtcblx0XHRcdFx0dGhpcy50aHJlYWRzUmVxdWVzdCg8RGVidWdQcm90b2NvbC5UaHJlYWRzUmVzcG9uc2U+IHJlc3BvbnNlLCByZXF1ZXN0KTtcblxuXHRcdFx0fSBlbHNlIGlmIChyZXF1ZXN0LmNvbW1hbmQgPT09ICd0ZXJtaW5hdGVUaHJlYWRzJykge1xuXHRcdFx0XHR0aGlzLnRlcm1pbmF0ZVRocmVhZHNSZXF1ZXN0KDxEZWJ1Z1Byb3RvY29sLlRlcm1pbmF0ZVRocmVhZHNSZXNwb25zZT4gcmVzcG9uc2UsIHJlcXVlc3QuYXJndW1lbnRzLCByZXF1ZXN0KTtcblxuXHRcdFx0fSBlbHNlIGlmIChyZXF1ZXN0LmNvbW1hbmQgPT09ICdldmFsdWF0ZScpIHtcblx0XHRcdFx0dGhpcy5ldmFsdWF0ZVJlcXVlc3QoPERlYnVnUHJvdG9jb2wuRXZhbHVhdGVSZXNwb25zZT4gcmVzcG9uc2UsIHJlcXVlc3QuYXJndW1lbnRzLCByZXF1ZXN0KTtcblxuXHRcdFx0fSBlbHNlIGlmIChyZXF1ZXN0LmNvbW1hbmQgPT09ICdzdGVwSW5UYXJnZXRzJykge1xuXHRcdFx0XHR0aGlzLnN0ZXBJblRhcmdldHNSZXF1ZXN0KDxEZWJ1Z1Byb3RvY29sLlN0ZXBJblRhcmdldHNSZXNwb25zZT4gcmVzcG9uc2UsIHJlcXVlc3QuYXJndW1lbnRzLCByZXF1ZXN0KTtcblxuXHRcdFx0fSBlbHNlIGlmIChyZXF1ZXN0LmNvbW1hbmQgPT09ICdnb3RvVGFyZ2V0cycpIHtcblx0XHRcdFx0dGhpcy5nb3RvVGFyZ2V0c1JlcXVlc3QoPERlYnVnUHJvdG9jb2wuR290b1RhcmdldHNSZXNwb25zZT4gcmVzcG9uc2UsIHJlcXVlc3QuYXJndW1lbnRzLCByZXF1ZXN0KTtcblxuXHRcdFx0fSBlbHNlIGlmIChyZXF1ZXN0LmNvbW1hbmQgPT09ICdjb21wbGV0aW9ucycpIHtcblx0XHRcdFx0dGhpcy5jb21wbGV0aW9uc1JlcXVlc3QoPERlYnVnUHJvdG9jb2wuQ29tcGxldGlvbnNSZXNwb25zZT4gcmVzcG9uc2UsIHJlcXVlc3QuYXJndW1lbnRzLCByZXF1ZXN0KTtcblxuXHRcdFx0fSBlbHNlIGlmIChyZXF1ZXN0LmNvbW1hbmQgPT09ICdleGNlcHRpb25JbmZvJykge1xuXHRcdFx0XHR0aGlzLmV4Y2VwdGlvbkluZm9SZXF1ZXN0KDxEZWJ1Z1Byb3RvY29sLkV4Y2VwdGlvbkluZm9SZXNwb25zZT4gcmVzcG9uc2UsIHJlcXVlc3QuYXJndW1lbnRzLCByZXF1ZXN0KTtcblxuXHRcdFx0fSBlbHNlIGlmIChyZXF1ZXN0LmNvbW1hbmQgPT09ICdsb2FkZWRTb3VyY2VzJykge1xuXHRcdFx0XHR0aGlzLmxvYWRlZFNvdXJjZXNSZXF1ZXN0KDxEZWJ1Z1Byb3RvY29sLkxvYWRlZFNvdXJjZXNSZXNwb25zZT4gcmVzcG9uc2UsIHJlcXVlc3QuYXJndW1lbnRzLCByZXF1ZXN0KTtcblxuXHRcdFx0fSBlbHNlIGlmIChyZXF1ZXN0LmNvbW1hbmQgPT09ICdkYXRhQnJlYWtwb2ludEluZm8nKSB7XG5cdFx0XHRcdHRoaXMuZGF0YUJyZWFrcG9pbnRJbmZvUmVxdWVzdCg8RGVidWdQcm90b2NvbC5EYXRhQnJlYWtwb2ludEluZm9SZXNwb25zZT4gcmVzcG9uc2UsIHJlcXVlc3QuYXJndW1lbnRzLCByZXF1ZXN0KTtcblxuXHRcdFx0fSBlbHNlIGlmIChyZXF1ZXN0LmNvbW1hbmQgPT09ICdzZXREYXRhQnJlYWtwb2ludHMnKSB7XG5cdFx0XHRcdHRoaXMuc2V0RGF0YUJyZWFrcG9pbnRzUmVxdWVzdCg8RGVidWdQcm90b2NvbC5TZXREYXRhQnJlYWtwb2ludHNSZXNwb25zZT4gcmVzcG9uc2UsIHJlcXVlc3QuYXJndW1lbnRzLCByZXF1ZXN0KTtcblxuXHRcdFx0fSBlbHNlIGlmIChyZXF1ZXN0LmNvbW1hbmQgPT09ICdyZWFkTWVtb3J5Jykge1xuXHRcdFx0XHR0aGlzLnJlYWRNZW1vcnlSZXF1ZXN0KDxEZWJ1Z1Byb3RvY29sLlJlYWRNZW1vcnlSZXNwb25zZT4gcmVzcG9uc2UsIHJlcXVlc3QuYXJndW1lbnRzLCByZXF1ZXN0KTtcblxuXHRcdFx0fSBlbHNlIGlmIChyZXF1ZXN0LmNvbW1hbmQgPT09ICd3cml0ZU1lbW9yeScpIHtcblx0XHRcdFx0dGhpcy53cml0ZU1lbW9yeVJlcXVlc3QoPERlYnVnUHJvdG9jb2wuV3JpdGVNZW1vcnlSZXNwb25zZT4gcmVzcG9uc2UsIHJlcXVlc3QuYXJndW1lbnRzLCByZXF1ZXN0KTtcblxuXHRcdFx0fSBlbHNlIGlmIChyZXF1ZXN0LmNvbW1hbmQgPT09ICdkaXNhc3NlbWJsZScpIHtcblx0XHRcdFx0dGhpcy5kaXNhc3NlbWJsZVJlcXVlc3QoPERlYnVnUHJvdG9jb2wuRGlzYXNzZW1ibGVSZXNwb25zZT4gcmVzcG9uc2UsIHJlcXVlc3QuYXJndW1lbnRzLCByZXF1ZXN0KTtcblxuXHRcdFx0fSBlbHNlIGlmIChyZXF1ZXN0LmNvbW1hbmQgPT09ICdjYW5jZWwnKSB7XG5cdFx0XHRcdHRoaXMuY2FuY2VsUmVxdWVzdCg8RGVidWdQcm90b2NvbC5DYW5jZWxSZXNwb25zZT4gcmVzcG9uc2UsIHJlcXVlc3QuYXJndW1lbnRzLCByZXF1ZXN0KTtcblxuXHRcdFx0fSBlbHNlIGlmIChyZXF1ZXN0LmNvbW1hbmQgPT09ICdicmVha3BvaW50TG9jYXRpb25zJykge1xuXHRcdFx0XHR0aGlzLmJyZWFrcG9pbnRMb2NhdGlvbnNSZXF1ZXN0KDxEZWJ1Z1Byb3RvY29sLkJyZWFrcG9pbnRMb2NhdGlvbnNSZXNwb25zZT4gcmVzcG9uc2UsIHJlcXVlc3QuYXJndW1lbnRzLCByZXF1ZXN0KTtcblxuXHRcdFx0fSBlbHNlIGlmIChyZXF1ZXN0LmNvbW1hbmQgPT09ICdzZXRJbnN0cnVjdGlvbkJyZWFrcG9pbnRzJykge1xuXHRcdFx0XHR0aGlzLnNldEluc3RydWN0aW9uQnJlYWtwb2ludHNSZXF1ZXN0KDxEZWJ1Z1Byb3RvY29sLlNldEluc3RydWN0aW9uQnJlYWtwb2ludHNSZXNwb25zZT4gcmVzcG9uc2UsIHJlcXVlc3QuYXJndW1lbnRzLCByZXF1ZXN0KTtcblxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dGhpcy5jdXN0b21SZXF1ZXN0KHJlcXVlc3QuY29tbWFuZCwgPERlYnVnUHJvdG9jb2wuUmVzcG9uc2U+IHJlc3BvbnNlLCByZXF1ZXN0LmFyZ3VtZW50cywgcmVxdWVzdCk7XG5cdFx0XHR9XG5cdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0dGhpcy5zZW5kRXJyb3JSZXNwb25zZShyZXNwb25zZSwgMTEwNCwgJ3tfc3RhY2t9JywgeyBfZXhjZXB0aW9uOiBlLm1lc3NhZ2UsIF9zdGFjazogZS5zdGFjayB9LCBFcnJvckRlc3RpbmF0aW9uLlRlbGVtZXRyeSk7XG5cdFx0fVxuXHR9XG5cblx0cHJvdGVjdGVkIGluaXRpYWxpemVSZXF1ZXN0KHJlc3BvbnNlOiBEZWJ1Z1Byb3RvY29sLkluaXRpYWxpemVSZXNwb25zZSwgYXJnczogRGVidWdQcm90b2NvbC5Jbml0aWFsaXplUmVxdWVzdEFyZ3VtZW50cyk6IHZvaWQge1xuXG5cdFx0Ly8gVGhpcyBkZWZhdWx0IGRlYnVnIGFkYXB0ZXIgZG9lcyBub3Qgc3VwcG9ydCBjb25kaXRpb25hbCBicmVha3BvaW50cy5cblx0XHRyZXNwb25zZS5ib2R5LnN1cHBvcnRzQ29uZGl0aW9uYWxCcmVha3BvaW50cyA9IGZhbHNlO1xuXG5cdFx0Ly8gVGhpcyBkZWZhdWx0IGRlYnVnIGFkYXB0ZXIgZG9lcyBub3Qgc3VwcG9ydCBoaXQgY29uZGl0aW9uYWwgYnJlYWtwb2ludHMuXG5cdFx0cmVzcG9uc2UuYm9keS5zdXBwb3J0c0hpdENvbmRpdGlvbmFsQnJlYWtwb2ludHMgPSBmYWxzZTtcblxuXHRcdC8vIFRoaXMgZGVmYXVsdCBkZWJ1ZyBhZGFwdGVyIGRvZXMgbm90IHN1cHBvcnQgZnVuY3Rpb24gYnJlYWtwb2ludHMuXG5cdFx0cmVzcG9uc2UuYm9keS5zdXBwb3J0c0Z1bmN0aW9uQnJlYWtwb2ludHMgPSBmYWxzZTtcblxuXHRcdC8vIFRoaXMgZGVmYXVsdCBkZWJ1ZyBhZGFwdGVyIGltcGxlbWVudHMgdGhlICdjb25maWd1cmF0aW9uRG9uZScgcmVxdWVzdC5cblx0XHRyZXNwb25zZS5ib2R5LnN1cHBvcnRzQ29uZmlndXJhdGlvbkRvbmVSZXF1ZXN0ID0gdHJ1ZTtcblxuXHRcdC8vIFRoaXMgZGVmYXVsdCBkZWJ1ZyBhZGFwdGVyIGRvZXMgbm90IHN1cHBvcnQgaG92ZXJzIGJhc2VkIG9uIHRoZSAnZXZhbHVhdGUnIHJlcXVlc3QuXG5cdFx0cmVzcG9uc2UuYm9keS5zdXBwb3J0c0V2YWx1YXRlRm9ySG92ZXJzID0gZmFsc2U7XG5cblx0XHQvLyBUaGlzIGRlZmF1bHQgZGVidWcgYWRhcHRlciBkb2VzIG5vdCBzdXBwb3J0IHRoZSAnc3RlcEJhY2snIHJlcXVlc3QuXG5cdFx0cmVzcG9uc2UuYm9keS5zdXBwb3J0c1N0ZXBCYWNrID0gZmFsc2U7XG5cblx0XHQvLyBUaGlzIGRlZmF1bHQgZGVidWcgYWRhcHRlciBkb2VzIG5vdCBzdXBwb3J0IHRoZSAnc2V0VmFyaWFibGUnIHJlcXVlc3QuXG5cdFx0cmVzcG9uc2UuYm9keS5zdXBwb3J0c1NldFZhcmlhYmxlID0gZmFsc2U7XG5cblx0XHQvLyBUaGlzIGRlZmF1bHQgZGVidWcgYWRhcHRlciBkb2VzIG5vdCBzdXBwb3J0IHRoZSAncmVzdGFydEZyYW1lJyByZXF1ZXN0LlxuXHRcdHJlc3BvbnNlLmJvZHkuc3VwcG9ydHNSZXN0YXJ0RnJhbWUgPSBmYWxzZTtcblxuXHRcdC8vIFRoaXMgZGVmYXVsdCBkZWJ1ZyBhZGFwdGVyIGRvZXMgbm90IHN1cHBvcnQgdGhlICdzdGVwSW5UYXJnZXRzJyByZXF1ZXN0LlxuXHRcdHJlc3BvbnNlLmJvZHkuc3VwcG9ydHNTdGVwSW5UYXJnZXRzUmVxdWVzdCA9IGZhbHNlO1xuXG5cdFx0Ly8gVGhpcyBkZWZhdWx0IGRlYnVnIGFkYXB0ZXIgZG9lcyBub3Qgc3VwcG9ydCB0aGUgJ2dvdG9UYXJnZXRzJyByZXF1ZXN0LlxuXHRcdHJlc3BvbnNlLmJvZHkuc3VwcG9ydHNHb3RvVGFyZ2V0c1JlcXVlc3QgPSBmYWxzZTtcblxuXHRcdC8vIFRoaXMgZGVmYXVsdCBkZWJ1ZyBhZGFwdGVyIGRvZXMgbm90IHN1cHBvcnQgdGhlICdjb21wbGV0aW9ucycgcmVxdWVzdC5cblx0XHRyZXNwb25zZS5ib2R5LnN1cHBvcnRzQ29tcGxldGlvbnNSZXF1ZXN0ID0gZmFsc2U7XG5cblx0XHQvLyBUaGlzIGRlZmF1bHQgZGVidWcgYWRhcHRlciBkb2VzIG5vdCBzdXBwb3J0IHRoZSAncmVzdGFydCcgcmVxdWVzdC5cblx0XHRyZXNwb25zZS5ib2R5LnN1cHBvcnRzUmVzdGFydFJlcXVlc3QgPSBmYWxzZTtcblxuXHRcdC8vIFRoaXMgZGVmYXVsdCBkZWJ1ZyBhZGFwdGVyIGRvZXMgbm90IHN1cHBvcnQgdGhlICdleGNlcHRpb25PcHRpb25zJyBhdHRyaWJ1dGUgb24gdGhlICdzZXRFeGNlcHRpb25CcmVha3BvaW50cycgcmVxdWVzdC5cblx0XHRyZXNwb25zZS5ib2R5LnN1cHBvcnRzRXhjZXB0aW9uT3B0aW9ucyA9IGZhbHNlO1xuXG5cdFx0Ly8gVGhpcyBkZWZhdWx0IGRlYnVnIGFkYXB0ZXIgZG9lcyBub3Qgc3VwcG9ydCB0aGUgJ2Zvcm1hdCcgYXR0cmlidXRlIG9uIHRoZSAndmFyaWFibGVzJywgJ2V2YWx1YXRlJywgYW5kICdzdGFja1RyYWNlJyByZXF1ZXN0LlxuXHRcdHJlc3BvbnNlLmJvZHkuc3VwcG9ydHNWYWx1ZUZvcm1hdHRpbmdPcHRpb25zID0gZmFsc2U7XG5cblx0XHQvLyBUaGlzIGRlYnVnIGFkYXB0ZXIgZG9lcyBub3Qgc3VwcG9ydCB0aGUgJ2V4Y2VwdGlvbkluZm8nIHJlcXVlc3QuXG5cdFx0cmVzcG9uc2UuYm9keS5zdXBwb3J0c0V4Y2VwdGlvbkluZm9SZXF1ZXN0ID0gZmFsc2U7XG5cblx0XHQvLyBUaGlzIGRlYnVnIGFkYXB0ZXIgZG9lcyBub3Qgc3VwcG9ydCB0aGUgJ1Rlcm1pbmF0ZURlYnVnZ2VlJyBhdHRyaWJ1dGUgb24gdGhlICdkaXNjb25uZWN0JyByZXF1ZXN0LlxuXHRcdHJlc3BvbnNlLmJvZHkuc3VwcG9ydFRlcm1pbmF0ZURlYnVnZ2VlID0gZmFsc2U7XG5cblx0XHQvLyBUaGlzIGRlYnVnIGFkYXB0ZXIgZG9lcyBub3Qgc3VwcG9ydCBkZWxheWVkIGxvYWRpbmcgb2Ygc3RhY2sgZnJhbWVzLlxuXHRcdHJlc3BvbnNlLmJvZHkuc3VwcG9ydHNEZWxheWVkU3RhY2tUcmFjZUxvYWRpbmcgPSBmYWxzZTtcblxuXHRcdC8vIFRoaXMgZGVidWcgYWRhcHRlciBkb2VzIG5vdCBzdXBwb3J0IHRoZSAnbG9hZGVkU291cmNlcycgcmVxdWVzdC5cblx0XHRyZXNwb25zZS5ib2R5LnN1cHBvcnRzTG9hZGVkU291cmNlc1JlcXVlc3QgPSBmYWxzZTtcblxuXHRcdC8vIFRoaXMgZGVidWcgYWRhcHRlciBkb2VzIG5vdCBzdXBwb3J0IHRoZSAnbG9nTWVzc2FnZScgYXR0cmlidXRlIG9mIHRoZSBTb3VyY2VCcmVha3BvaW50LlxuXHRcdHJlc3BvbnNlLmJvZHkuc3VwcG9ydHNMb2dQb2ludHMgPSBmYWxzZTtcblxuXHRcdC8vIFRoaXMgZGVidWcgYWRhcHRlciBkb2VzIG5vdCBzdXBwb3J0IHRoZSAndGVybWluYXRlVGhyZWFkcycgcmVxdWVzdC5cblx0XHRyZXNwb25zZS5ib2R5LnN1cHBvcnRzVGVybWluYXRlVGhyZWFkc1JlcXVlc3QgPSBmYWxzZTtcblxuXHRcdC8vIFRoaXMgZGVidWcgYWRhcHRlciBkb2VzIG5vdCBzdXBwb3J0IHRoZSAnc2V0RXhwcmVzc2lvbicgcmVxdWVzdC5cblx0XHRyZXNwb25zZS5ib2R5LnN1cHBvcnRzU2V0RXhwcmVzc2lvbiA9IGZhbHNlO1xuXG5cdFx0Ly8gVGhpcyBkZWJ1ZyBhZGFwdGVyIGRvZXMgbm90IHN1cHBvcnQgdGhlICd0ZXJtaW5hdGUnIHJlcXVlc3QuXG5cdFx0cmVzcG9uc2UuYm9keS5zdXBwb3J0c1Rlcm1pbmF0ZVJlcXVlc3QgPSBmYWxzZTtcblxuXHRcdC8vIFRoaXMgZGVidWcgYWRhcHRlciBkb2VzIG5vdCBzdXBwb3J0IGRhdGEgYnJlYWtwb2ludHMuXG5cdFx0cmVzcG9uc2UuYm9keS5zdXBwb3J0c0RhdGFCcmVha3BvaW50cyA9IGZhbHNlO1xuXG5cdFx0LyoqIFRoaXMgZGVidWcgYWRhcHRlciBkb2VzIG5vdCBzdXBwb3J0IHRoZSAncmVhZE1lbW9yeScgcmVxdWVzdC4gKi9cblx0XHRyZXNwb25zZS5ib2R5LnN1cHBvcnRzUmVhZE1lbW9yeVJlcXVlc3QgPSBmYWxzZTtcblxuXHRcdC8qKiBUaGUgZGVidWcgYWRhcHRlciBkb2VzIG5vdCBzdXBwb3J0IHRoZSAnZGlzYXNzZW1ibGUnIHJlcXVlc3QuICovXG5cdFx0cmVzcG9uc2UuYm9keS5zdXBwb3J0c0Rpc2Fzc2VtYmxlUmVxdWVzdCA9IGZhbHNlO1xuXG5cdFx0LyoqIFRoZSBkZWJ1ZyBhZGFwdGVyIGRvZXMgbm90IHN1cHBvcnQgdGhlICdjYW5jZWwnIHJlcXVlc3QuICovXG5cdFx0cmVzcG9uc2UuYm9keS5zdXBwb3J0c0NhbmNlbFJlcXVlc3QgPSBmYWxzZTtcblxuXHRcdC8qKiBUaGUgZGVidWcgYWRhcHRlciBkb2VzIG5vdCBzdXBwb3J0IHRoZSAnYnJlYWtwb2ludExvY2F0aW9ucycgcmVxdWVzdC4gKi9cblx0XHRyZXNwb25zZS5ib2R5LnN1cHBvcnRzQnJlYWtwb2ludExvY2F0aW9uc1JlcXVlc3QgPSBmYWxzZTtcblxuXHRcdC8qKiBUaGUgZGVidWcgYWRhcHRlciBkb2VzIG5vdCBzdXBwb3J0IHRoZSAnY2xpcGJvYXJkJyBjb250ZXh0IHZhbHVlIGluIHRoZSAnZXZhbHVhdGUnIHJlcXVlc3QuICovXG5cdFx0cmVzcG9uc2UuYm9keS5zdXBwb3J0c0NsaXBib2FyZENvbnRleHQgPSBmYWxzZTtcblxuXHRcdC8qKiBUaGUgZGVidWcgYWRhcHRlciBkb2VzIG5vdCBzdXBwb3J0IHN0ZXBwaW5nIGdyYW51bGFyaXRpZXMgZm9yIHRoZSBzdGVwcGluZyByZXF1ZXN0cy4gKi9cblx0XHRyZXNwb25zZS5ib2R5LnN1cHBvcnRzU3RlcHBpbmdHcmFudWxhcml0eSA9IGZhbHNlO1xuXG5cdFx0LyoqIFRoZSBkZWJ1ZyBhZGFwdGVyIGRvZXMgbm90IHN1cHBvcnQgdGhlICdzZXRJbnN0cnVjdGlvbkJyZWFrcG9pbnRzJyByZXF1ZXN0LiAqL1xuXHRcdHJlc3BvbnNlLmJvZHkuc3VwcG9ydHNJbnN0cnVjdGlvbkJyZWFrcG9pbnRzID0gZmFsc2U7XG5cblx0XHQvKiogVGhlIGRlYnVnIGFkYXB0ZXIgZG9lcyBub3Qgc3VwcG9ydCAnZmlsdGVyT3B0aW9ucycgb24gdGhlICdzZXRFeGNlcHRpb25CcmVha3BvaW50cycgcmVxdWVzdC4gKi9cblx0XHRyZXNwb25zZS5ib2R5LnN1cHBvcnRzRXhjZXB0aW9uRmlsdGVyT3B0aW9ucyA9IGZhbHNlO1xuXG5cdFx0dGhpcy5zZW5kUmVzcG9uc2UocmVzcG9uc2UpO1xuXHR9XG5cblx0cHJvdGVjdGVkIGRpc2Nvbm5lY3RSZXF1ZXN0KHJlc3BvbnNlOiBEZWJ1Z1Byb3RvY29sLkRpc2Nvbm5lY3RSZXNwb25zZSwgYXJnczogRGVidWdQcm90b2NvbC5EaXNjb25uZWN0QXJndW1lbnRzLCByZXF1ZXN0PzogRGVidWdQcm90b2NvbC5SZXF1ZXN0KTogdm9pZCB7XG5cdFx0dGhpcy5zZW5kUmVzcG9uc2UocmVzcG9uc2UpO1xuXHRcdHRoaXMuc2h1dGRvd24oKTtcblx0fVxuXG5cdHByb3RlY3RlZCBsYXVuY2hSZXF1ZXN0KHJlc3BvbnNlOiBEZWJ1Z1Byb3RvY29sLkxhdW5jaFJlc3BvbnNlLCBhcmdzOiBEZWJ1Z1Byb3RvY29sLkxhdW5jaFJlcXVlc3RBcmd1bWVudHMsIHJlcXVlc3Q/OiBEZWJ1Z1Byb3RvY29sLlJlcXVlc3QpOiB2b2lkIHtcblx0XHR0aGlzLnNlbmRSZXNwb25zZShyZXNwb25zZSk7XG5cdH1cblxuXHRwcm90ZWN0ZWQgYXR0YWNoUmVxdWVzdChyZXNwb25zZTogRGVidWdQcm90b2NvbC5BdHRhY2hSZXNwb25zZSwgYXJnczogRGVidWdQcm90b2NvbC5BdHRhY2hSZXF1ZXN0QXJndW1lbnRzLCByZXF1ZXN0PzogRGVidWdQcm90b2NvbC5SZXF1ZXN0KTogdm9pZCB7XG5cdFx0dGhpcy5zZW5kUmVzcG9uc2UocmVzcG9uc2UpO1xuXHR9XG5cblx0cHJvdGVjdGVkIHRlcm1pbmF0ZVJlcXVlc3QocmVzcG9uc2U6IERlYnVnUHJvdG9jb2wuVGVybWluYXRlUmVzcG9uc2UsIGFyZ3M6IERlYnVnUHJvdG9jb2wuVGVybWluYXRlQXJndW1lbnRzLCByZXF1ZXN0PzogRGVidWdQcm90b2NvbC5SZXF1ZXN0KTogdm9pZCB7XG5cdFx0dGhpcy5zZW5kUmVzcG9uc2UocmVzcG9uc2UpO1xuXHR9XG5cblx0cHJvdGVjdGVkIHJlc3RhcnRSZXF1ZXN0KHJlc3BvbnNlOiBEZWJ1Z1Byb3RvY29sLlJlc3RhcnRSZXNwb25zZSwgYXJnczogRGVidWdQcm90b2NvbC5SZXN0YXJ0QXJndW1lbnRzLCByZXF1ZXN0PzogRGVidWdQcm90b2NvbC5SZXF1ZXN0KTogdm9pZCB7XG5cdFx0dGhpcy5zZW5kUmVzcG9uc2UocmVzcG9uc2UpO1xuXHR9XG5cblx0cHJvdGVjdGVkIHNldEJyZWFrUG9pbnRzUmVxdWVzdChyZXNwb25zZTogRGVidWdQcm90b2NvbC5TZXRCcmVha3BvaW50c1Jlc3BvbnNlLCBhcmdzOiBEZWJ1Z1Byb3RvY29sLlNldEJyZWFrcG9pbnRzQXJndW1lbnRzLCByZXF1ZXN0PzogRGVidWdQcm90b2NvbC5SZXF1ZXN0KTogdm9pZCB7XG5cdFx0dGhpcy5zZW5kUmVzcG9uc2UocmVzcG9uc2UpO1xuXHR9XG5cblx0cHJvdGVjdGVkIHNldEZ1bmN0aW9uQnJlYWtQb2ludHNSZXF1ZXN0KHJlc3BvbnNlOiBEZWJ1Z1Byb3RvY29sLlNldEZ1bmN0aW9uQnJlYWtwb2ludHNSZXNwb25zZSwgYXJnczogRGVidWdQcm90b2NvbC5TZXRGdW5jdGlvbkJyZWFrcG9pbnRzQXJndW1lbnRzLCByZXF1ZXN0PzogRGVidWdQcm90b2NvbC5SZXF1ZXN0KTogdm9pZCB7XG5cdFx0dGhpcy5zZW5kUmVzcG9uc2UocmVzcG9uc2UpO1xuXHR9XG5cblx0cHJvdGVjdGVkIHNldEV4Y2VwdGlvbkJyZWFrUG9pbnRzUmVxdWVzdChyZXNwb25zZTogRGVidWdQcm90b2NvbC5TZXRFeGNlcHRpb25CcmVha3BvaW50c1Jlc3BvbnNlLCBhcmdzOiBEZWJ1Z1Byb3RvY29sLlNldEV4Y2VwdGlvbkJyZWFrcG9pbnRzQXJndW1lbnRzLCByZXF1ZXN0PzogRGVidWdQcm90b2NvbC5SZXF1ZXN0KTogdm9pZCB7XG5cdFx0dGhpcy5zZW5kUmVzcG9uc2UocmVzcG9uc2UpO1xuXHR9XG5cblx0cHJvdGVjdGVkIGNvbmZpZ3VyYXRpb25Eb25lUmVxdWVzdChyZXNwb25zZTogRGVidWdQcm90b2NvbC5Db25maWd1cmF0aW9uRG9uZVJlc3BvbnNlLCBhcmdzOiBEZWJ1Z1Byb3RvY29sLkNvbmZpZ3VyYXRpb25Eb25lQXJndW1lbnRzLCByZXF1ZXN0PzogRGVidWdQcm90b2NvbC5SZXF1ZXN0KTogdm9pZCB7XG5cdFx0dGhpcy5zZW5kUmVzcG9uc2UocmVzcG9uc2UpO1xuXHR9XG5cblx0cHJvdGVjdGVkIGNvbnRpbnVlUmVxdWVzdChyZXNwb25zZTogRGVidWdQcm90b2NvbC5Db250aW51ZVJlc3BvbnNlLCBhcmdzOiBEZWJ1Z1Byb3RvY29sLkNvbnRpbnVlQXJndW1lbnRzLCByZXF1ZXN0PzogRGVidWdQcm90b2NvbC5SZXF1ZXN0KSA6IHZvaWQge1xuXHRcdHRoaXMuc2VuZFJlc3BvbnNlKHJlc3BvbnNlKTtcblx0fVxuXG5cdHByb3RlY3RlZCBuZXh0UmVxdWVzdChyZXNwb25zZTogRGVidWdQcm90b2NvbC5OZXh0UmVzcG9uc2UsIGFyZ3M6IERlYnVnUHJvdG9jb2wuTmV4dEFyZ3VtZW50cywgcmVxdWVzdD86IERlYnVnUHJvdG9jb2wuUmVxdWVzdCkgOiB2b2lkIHtcblx0XHR0aGlzLnNlbmRSZXNwb25zZShyZXNwb25zZSk7XG5cdH1cblxuXHRwcm90ZWN0ZWQgc3RlcEluUmVxdWVzdChyZXNwb25zZTogRGVidWdQcm90b2NvbC5TdGVwSW5SZXNwb25zZSwgYXJnczogRGVidWdQcm90b2NvbC5TdGVwSW5Bcmd1bWVudHMsIHJlcXVlc3Q/OiBEZWJ1Z1Byb3RvY29sLlJlcXVlc3QpIDogdm9pZCB7XG5cdFx0dGhpcy5zZW5kUmVzcG9uc2UocmVzcG9uc2UpO1xuXHR9XG5cblx0cHJvdGVjdGVkIHN0ZXBPdXRSZXF1ZXN0KHJlc3BvbnNlOiBEZWJ1Z1Byb3RvY29sLlN0ZXBPdXRSZXNwb25zZSwgYXJnczogRGVidWdQcm90b2NvbC5TdGVwT3V0QXJndW1lbnRzLCByZXF1ZXN0PzogRGVidWdQcm90b2NvbC5SZXF1ZXN0KSA6IHZvaWQge1xuXHRcdHRoaXMuc2VuZFJlc3BvbnNlKHJlc3BvbnNlKTtcblx0fVxuXG5cdHByb3RlY3RlZCBzdGVwQmFja1JlcXVlc3QocmVzcG9uc2U6IERlYnVnUHJvdG9jb2wuU3RlcEJhY2tSZXNwb25zZSwgYXJnczogRGVidWdQcm90b2NvbC5TdGVwQmFja0FyZ3VtZW50cywgcmVxdWVzdD86IERlYnVnUHJvdG9jb2wuUmVxdWVzdCkgOiB2b2lkIHtcblx0XHR0aGlzLnNlbmRSZXNwb25zZShyZXNwb25zZSk7XG5cdH1cblxuXHRwcm90ZWN0ZWQgcmV2ZXJzZUNvbnRpbnVlUmVxdWVzdChyZXNwb25zZTogRGVidWdQcm90b2NvbC5SZXZlcnNlQ29udGludWVSZXNwb25zZSwgYXJnczogRGVidWdQcm90b2NvbC5SZXZlcnNlQ29udGludWVBcmd1bWVudHMsIHJlcXVlc3Q/OiBEZWJ1Z1Byb3RvY29sLlJlcXVlc3QpIDogdm9pZCB7XG5cdFx0dGhpcy5zZW5kUmVzcG9uc2UocmVzcG9uc2UpO1xuXHR9XG5cblx0cHJvdGVjdGVkIHJlc3RhcnRGcmFtZVJlcXVlc3QocmVzcG9uc2U6IERlYnVnUHJvdG9jb2wuUmVzdGFydEZyYW1lUmVzcG9uc2UsIGFyZ3M6IERlYnVnUHJvdG9jb2wuUmVzdGFydEZyYW1lQXJndW1lbnRzLCByZXF1ZXN0PzogRGVidWdQcm90b2NvbC5SZXF1ZXN0KSA6IHZvaWQge1xuXHRcdHRoaXMuc2VuZFJlc3BvbnNlKHJlc3BvbnNlKTtcblx0fVxuXG5cdHByb3RlY3RlZCBnb3RvUmVxdWVzdChyZXNwb25zZTogRGVidWdQcm90b2NvbC5Hb3RvUmVzcG9uc2UsIGFyZ3M6IERlYnVnUHJvdG9jb2wuR290b0FyZ3VtZW50cywgcmVxdWVzdD86IERlYnVnUHJvdG9jb2wuUmVxdWVzdCkgOiB2b2lkIHtcblx0XHR0aGlzLnNlbmRSZXNwb25zZShyZXNwb25zZSk7XG5cdH1cblxuXHRwcm90ZWN0ZWQgcGF1c2VSZXF1ZXN0KHJlc3BvbnNlOiBEZWJ1Z1Byb3RvY29sLlBhdXNlUmVzcG9uc2UsIGFyZ3M6IERlYnVnUHJvdG9jb2wuUGF1c2VBcmd1bWVudHMsIHJlcXVlc3Q/OiBEZWJ1Z1Byb3RvY29sLlJlcXVlc3QpIDogdm9pZCB7XG5cdFx0dGhpcy5zZW5kUmVzcG9uc2UocmVzcG9uc2UpO1xuXHR9XG5cblx0cHJvdGVjdGVkIHNvdXJjZVJlcXVlc3QocmVzcG9uc2U6IERlYnVnUHJvdG9jb2wuU291cmNlUmVzcG9uc2UsIGFyZ3M6IERlYnVnUHJvdG9jb2wuU291cmNlQXJndW1lbnRzLCByZXF1ZXN0PzogRGVidWdQcm90b2NvbC5SZXF1ZXN0KSA6IHZvaWQge1xuXHRcdHRoaXMuc2VuZFJlc3BvbnNlKHJlc3BvbnNlKTtcblx0fVxuXG5cdHByb3RlY3RlZCB0aHJlYWRzUmVxdWVzdChyZXNwb25zZTogRGVidWdQcm90b2NvbC5UaHJlYWRzUmVzcG9uc2UsIHJlcXVlc3Q/OiBEZWJ1Z1Byb3RvY29sLlJlcXVlc3QpOiB2b2lkIHtcblx0XHR0aGlzLnNlbmRSZXNwb25zZShyZXNwb25zZSk7XG5cdH1cblxuXHRwcm90ZWN0ZWQgdGVybWluYXRlVGhyZWFkc1JlcXVlc3QocmVzcG9uc2U6IERlYnVnUHJvdG9jb2wuVGVybWluYXRlVGhyZWFkc1Jlc3BvbnNlLCBhcmdzOiBEZWJ1Z1Byb3RvY29sLlRlcm1pbmF0ZVRocmVhZHNBcmd1bWVudHMsIHJlcXVlc3Q/OiBEZWJ1Z1Byb3RvY29sLlJlcXVlc3QpOiB2b2lkIHtcblx0XHR0aGlzLnNlbmRSZXNwb25zZShyZXNwb25zZSk7XG5cdH1cblxuXHRwcm90ZWN0ZWQgc3RhY2tUcmFjZVJlcXVlc3QocmVzcG9uc2U6IERlYnVnUHJvdG9jb2wuU3RhY2tUcmFjZVJlc3BvbnNlLCBhcmdzOiBEZWJ1Z1Byb3RvY29sLlN0YWNrVHJhY2VBcmd1bWVudHMsIHJlcXVlc3Q/OiBEZWJ1Z1Byb3RvY29sLlJlcXVlc3QpOiB2b2lkIHtcblx0XHR0aGlzLnNlbmRSZXNwb25zZShyZXNwb25zZSk7XG5cdH1cblxuXHRwcm90ZWN0ZWQgc2NvcGVzUmVxdWVzdChyZXNwb25zZTogRGVidWdQcm90b2NvbC5TY29wZXNSZXNwb25zZSwgYXJnczogRGVidWdQcm90b2NvbC5TY29wZXNBcmd1bWVudHMsIHJlcXVlc3Q/OiBEZWJ1Z1Byb3RvY29sLlJlcXVlc3QpOiB2b2lkIHtcblx0XHR0aGlzLnNlbmRSZXNwb25zZShyZXNwb25zZSk7XG5cdH1cblxuXHRwcm90ZWN0ZWQgdmFyaWFibGVzUmVxdWVzdChyZXNwb25zZTogRGVidWdQcm90b2NvbC5WYXJpYWJsZXNSZXNwb25zZSwgYXJnczogRGVidWdQcm90b2NvbC5WYXJpYWJsZXNBcmd1bWVudHMsIHJlcXVlc3Q/OiBEZWJ1Z1Byb3RvY29sLlJlcXVlc3QpOiB2b2lkIHtcblx0XHR0aGlzLnNlbmRSZXNwb25zZShyZXNwb25zZSk7XG5cdH1cblxuXHRwcm90ZWN0ZWQgc2V0VmFyaWFibGVSZXF1ZXN0KHJlc3BvbnNlOiBEZWJ1Z1Byb3RvY29sLlNldFZhcmlhYmxlUmVzcG9uc2UsIGFyZ3M6IERlYnVnUHJvdG9jb2wuU2V0VmFyaWFibGVBcmd1bWVudHMsIHJlcXVlc3Q/OiBEZWJ1Z1Byb3RvY29sLlJlcXVlc3QpOiB2b2lkIHtcblx0XHR0aGlzLnNlbmRSZXNwb25zZShyZXNwb25zZSk7XG5cdH1cblxuXHRwcm90ZWN0ZWQgc2V0RXhwcmVzc2lvblJlcXVlc3QocmVzcG9uc2U6IERlYnVnUHJvdG9jb2wuU2V0RXhwcmVzc2lvblJlc3BvbnNlLCBhcmdzOiBEZWJ1Z1Byb3RvY29sLlNldEV4cHJlc3Npb25Bcmd1bWVudHMsIHJlcXVlc3Q/OiBEZWJ1Z1Byb3RvY29sLlJlcXVlc3QpOiB2b2lkIHtcblx0XHR0aGlzLnNlbmRSZXNwb25zZShyZXNwb25zZSk7XG5cdH1cblxuXHRwcm90ZWN0ZWQgZXZhbHVhdGVSZXF1ZXN0KHJlc3BvbnNlOiBEZWJ1Z1Byb3RvY29sLkV2YWx1YXRlUmVzcG9uc2UsIGFyZ3M6IERlYnVnUHJvdG9jb2wuRXZhbHVhdGVBcmd1bWVudHMsIHJlcXVlc3Q/OiBEZWJ1Z1Byb3RvY29sLlJlcXVlc3QpOiB2b2lkIHtcblx0XHR0aGlzLnNlbmRSZXNwb25zZShyZXNwb25zZSk7XG5cdH1cblxuXHRwcm90ZWN0ZWQgc3RlcEluVGFyZ2V0c1JlcXVlc3QocmVzcG9uc2U6IERlYnVnUHJvdG9jb2wuU3RlcEluVGFyZ2V0c1Jlc3BvbnNlLCBhcmdzOiBEZWJ1Z1Byb3RvY29sLlN0ZXBJblRhcmdldHNBcmd1bWVudHMsIHJlcXVlc3Q/OiBEZWJ1Z1Byb3RvY29sLlJlcXVlc3QpOiB2b2lkIHtcblx0XHR0aGlzLnNlbmRSZXNwb25zZShyZXNwb25zZSk7XG5cdH1cblxuXHRwcm90ZWN0ZWQgZ290b1RhcmdldHNSZXF1ZXN0KHJlc3BvbnNlOiBEZWJ1Z1Byb3RvY29sLkdvdG9UYXJnZXRzUmVzcG9uc2UsIGFyZ3M6IERlYnVnUHJvdG9jb2wuR290b1RhcmdldHNBcmd1bWVudHMsIHJlcXVlc3Q/OiBEZWJ1Z1Byb3RvY29sLlJlcXVlc3QpOiB2b2lkIHtcblx0XHR0aGlzLnNlbmRSZXNwb25zZShyZXNwb25zZSk7XG5cdH1cblxuXHRwcm90ZWN0ZWQgY29tcGxldGlvbnNSZXF1ZXN0KHJlc3BvbnNlOiBEZWJ1Z1Byb3RvY29sLkNvbXBsZXRpb25zUmVzcG9uc2UsIGFyZ3M6IERlYnVnUHJvdG9jb2wuQ29tcGxldGlvbnNBcmd1bWVudHMsIHJlcXVlc3Q/OiBEZWJ1Z1Byb3RvY29sLlJlcXVlc3QpOiB2b2lkIHtcblx0XHR0aGlzLnNlbmRSZXNwb25zZShyZXNwb25zZSk7XG5cdH1cblxuXHRwcm90ZWN0ZWQgZXhjZXB0aW9uSW5mb1JlcXVlc3QocmVzcG9uc2U6IERlYnVnUHJvdG9jb2wuRXhjZXB0aW9uSW5mb1Jlc3BvbnNlLCBhcmdzOiBEZWJ1Z1Byb3RvY29sLkV4Y2VwdGlvbkluZm9Bcmd1bWVudHMsIHJlcXVlc3Q/OiBEZWJ1Z1Byb3RvY29sLlJlcXVlc3QpOiB2b2lkIHtcblx0XHR0aGlzLnNlbmRSZXNwb25zZShyZXNwb25zZSk7XG5cdH1cblxuXHRwcm90ZWN0ZWQgbG9hZGVkU291cmNlc1JlcXVlc3QocmVzcG9uc2U6IERlYnVnUHJvdG9jb2wuTG9hZGVkU291cmNlc1Jlc3BvbnNlLCBhcmdzOiBEZWJ1Z1Byb3RvY29sLkxvYWRlZFNvdXJjZXNBcmd1bWVudHMsIHJlcXVlc3Q/OiBEZWJ1Z1Byb3RvY29sLlJlcXVlc3QpOiB2b2lkIHtcblx0XHR0aGlzLnNlbmRSZXNwb25zZShyZXNwb25zZSk7XG5cdH1cblxuXHRwcm90ZWN0ZWQgZGF0YUJyZWFrcG9pbnRJbmZvUmVxdWVzdChyZXNwb25zZTogRGVidWdQcm90b2NvbC5EYXRhQnJlYWtwb2ludEluZm9SZXNwb25zZSwgYXJnczogRGVidWdQcm90b2NvbC5EYXRhQnJlYWtwb2ludEluZm9Bcmd1bWVudHMsIHJlcXVlc3Q/OiBEZWJ1Z1Byb3RvY29sLlJlcXVlc3QpOiB2b2lkIHtcblx0XHR0aGlzLnNlbmRSZXNwb25zZShyZXNwb25zZSk7XG5cdH1cblxuXHRwcm90ZWN0ZWQgc2V0RGF0YUJyZWFrcG9pbnRzUmVxdWVzdChyZXNwb25zZTogRGVidWdQcm90b2NvbC5TZXREYXRhQnJlYWtwb2ludHNSZXNwb25zZSwgYXJnczogRGVidWdQcm90b2NvbC5TZXREYXRhQnJlYWtwb2ludHNBcmd1bWVudHMsIHJlcXVlc3Q/OiBEZWJ1Z1Byb3RvY29sLlJlcXVlc3QpOiB2b2lkIHtcblx0XHR0aGlzLnNlbmRSZXNwb25zZShyZXNwb25zZSk7XG5cdH1cblxuXHRwcm90ZWN0ZWQgcmVhZE1lbW9yeVJlcXVlc3QocmVzcG9uc2U6IERlYnVnUHJvdG9jb2wuUmVhZE1lbW9yeVJlc3BvbnNlLCBhcmdzOiBEZWJ1Z1Byb3RvY29sLlJlYWRNZW1vcnlBcmd1bWVudHMsIHJlcXVlc3Q/OiBEZWJ1Z1Byb3RvY29sLlJlcXVlc3QpOiB2b2lkIHtcblx0XHR0aGlzLnNlbmRSZXNwb25zZShyZXNwb25zZSk7XG5cdH1cblxuXHRwcm90ZWN0ZWQgd3JpdGVNZW1vcnlSZXF1ZXN0KHJlc3BvbnNlOiBEZWJ1Z1Byb3RvY29sLldyaXRlTWVtb3J5UmVzcG9uc2UsIGFyZ3M6IERlYnVnUHJvdG9jb2wuV3JpdGVNZW1vcnlBcmd1bWVudHMsIHJlcXVlc3Q/OiBEZWJ1Z1Byb3RvY29sLlJlcXVlc3QpOiB2b2lkIHtcblx0XHR0aGlzLnNlbmRSZXNwb25zZShyZXNwb25zZSk7XG5cdH1cblxuXHRwcm90ZWN0ZWQgZGlzYXNzZW1ibGVSZXF1ZXN0KHJlc3BvbnNlOiBEZWJ1Z1Byb3RvY29sLkRpc2Fzc2VtYmxlUmVzcG9uc2UsIGFyZ3M6IERlYnVnUHJvdG9jb2wuRGlzYXNzZW1ibGVBcmd1bWVudHMsIHJlcXVlc3Q/OiBEZWJ1Z1Byb3RvY29sLlJlcXVlc3QpOiB2b2lkIHtcblx0XHR0aGlzLnNlbmRSZXNwb25zZShyZXNwb25zZSk7XG5cdH1cblxuXHRwcm90ZWN0ZWQgY2FuY2VsUmVxdWVzdChyZXNwb25zZTogRGVidWdQcm90b2NvbC5DYW5jZWxSZXNwb25zZSwgYXJnczogRGVidWdQcm90b2NvbC5DYW5jZWxBcmd1bWVudHMsIHJlcXVlc3Q/OiBEZWJ1Z1Byb3RvY29sLlJlcXVlc3QpOiB2b2lkIHtcblx0XHR0aGlzLnNlbmRSZXNwb25zZShyZXNwb25zZSk7XG5cdH1cblxuXHRwcm90ZWN0ZWQgYnJlYWtwb2ludExvY2F0aW9uc1JlcXVlc3QocmVzcG9uc2U6IERlYnVnUHJvdG9jb2wuQnJlYWtwb2ludExvY2F0aW9uc1Jlc3BvbnNlLCBhcmdzOiBEZWJ1Z1Byb3RvY29sLkJyZWFrcG9pbnRMb2NhdGlvbnNBcmd1bWVudHMsIHJlcXVlc3Q/OiBEZWJ1Z1Byb3RvY29sLlJlcXVlc3QpOiB2b2lkIHtcblx0XHR0aGlzLnNlbmRSZXNwb25zZShyZXNwb25zZSk7XG5cdH1cblxuXHRwcm90ZWN0ZWQgc2V0SW5zdHJ1Y3Rpb25CcmVha3BvaW50c1JlcXVlc3QocmVzcG9uc2U6IERlYnVnUHJvdG9jb2wuU2V0SW5zdHJ1Y3Rpb25CcmVha3BvaW50c1Jlc3BvbnNlLCBhcmdzOiBEZWJ1Z1Byb3RvY29sLlNldEluc3RydWN0aW9uQnJlYWtwb2ludHNBcmd1bWVudHMsIHJlcXVlc3Q/OiBEZWJ1Z1Byb3RvY29sLlJlcXVlc3QpOiB2b2lkIHtcblx0XHR0aGlzLnNlbmRSZXNwb25zZShyZXNwb25zZSk7XG5cdH1cblxuXHQvKipcblx0ICogT3ZlcnJpZGUgdGhpcyBob29rIHRvIGltcGxlbWVudCBjdXN0b20gcmVxdWVzdHMuXG5cdCAqL1xuXHRwcm90ZWN0ZWQgY3VzdG9tUmVxdWVzdChjb21tYW5kOiBzdHJpbmcsIHJlc3BvbnNlOiBEZWJ1Z1Byb3RvY29sLlJlc3BvbnNlLCBhcmdzOiBhbnksIHJlcXVlc3Q/OiBEZWJ1Z1Byb3RvY29sLlJlcXVlc3QpOiB2b2lkIHtcblx0XHR0aGlzLnNlbmRFcnJvclJlc3BvbnNlKHJlc3BvbnNlLCAxMDE0LCAndW5yZWNvZ25pemVkIHJlcXVlc3QnLCBudWxsLCBFcnJvckRlc3RpbmF0aW9uLlRlbGVtZXRyeSk7XG5cdH1cblxuXHQvLy0tLS0gcHJvdGVjdGVkIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuXHRwcm90ZWN0ZWQgY29udmVydENsaWVudExpbmVUb0RlYnVnZ2VyKGxpbmU6IG51bWJlcik6IG51bWJlciB7XG5cdFx0aWYgKHRoaXMuX2RlYnVnZ2VyTGluZXNTdGFydEF0MSkge1xuXHRcdFx0cmV0dXJuIHRoaXMuX2NsaWVudExpbmVzU3RhcnRBdDEgPyBsaW5lIDogbGluZSArIDE7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzLl9jbGllbnRMaW5lc1N0YXJ0QXQxID8gbGluZSAtIDEgOiBsaW5lO1xuXHR9XG5cblx0cHJvdGVjdGVkIGNvbnZlcnREZWJ1Z2dlckxpbmVUb0NsaWVudChsaW5lOiBudW1iZXIpOiBudW1iZXIge1xuXHRcdGlmICh0aGlzLl9kZWJ1Z2dlckxpbmVzU3RhcnRBdDEpIHtcblx0XHRcdHJldHVybiB0aGlzLl9jbGllbnRMaW5lc1N0YXJ0QXQxID8gbGluZSA6IGxpbmUgLSAxO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcy5fY2xpZW50TGluZXNTdGFydEF0MSA/IGxpbmUgKyAxIDogbGluZTtcblx0fVxuXG5cdHByb3RlY3RlZCBjb252ZXJ0Q2xpZW50Q29sdW1uVG9EZWJ1Z2dlcihjb2x1bW46IG51bWJlcik6IG51bWJlciB7XG5cdFx0aWYgKHRoaXMuX2RlYnVnZ2VyQ29sdW1uc1N0YXJ0QXQxKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fY2xpZW50Q29sdW1uc1N0YXJ0QXQxID8gY29sdW1uIDogY29sdW1uICsgMTtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXMuX2NsaWVudENvbHVtbnNTdGFydEF0MSA/IGNvbHVtbiAtIDEgOiBjb2x1bW47XG5cdH1cblxuXHRwcm90ZWN0ZWQgY29udmVydERlYnVnZ2VyQ29sdW1uVG9DbGllbnQoY29sdW1uOiBudW1iZXIpOiBudW1iZXIge1xuXHRcdGlmICh0aGlzLl9kZWJ1Z2dlckNvbHVtbnNTdGFydEF0MSkge1xuXHRcdFx0cmV0dXJuIHRoaXMuX2NsaWVudENvbHVtbnNTdGFydEF0MSA/IGNvbHVtbiA6IGNvbHVtbiAtIDE7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzLl9jbGllbnRDb2x1bW5zU3RhcnRBdDEgPyBjb2x1bW4gKyAxIDogY29sdW1uO1xuXHR9XG5cblx0cHJvdGVjdGVkIGNvbnZlcnRDbGllbnRQYXRoVG9EZWJ1Z2dlcihjbGllbnRQYXRoOiBzdHJpbmcpOiBzdHJpbmcge1xuXHRcdGlmICh0aGlzLl9jbGllbnRQYXRoc0FyZVVSSXMgIT09IHRoaXMuX2RlYnVnZ2VyUGF0aHNBcmVVUklzKSB7XG5cdFx0XHRpZiAodGhpcy5fY2xpZW50UGF0aHNBcmVVUklzKSB7XG5cdFx0XHRcdHJldHVybiBEZWJ1Z1Nlc3Npb24udXJpMnBhdGgoY2xpZW50UGF0aCk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRyZXR1cm4gRGVidWdTZXNzaW9uLnBhdGgydXJpKGNsaWVudFBhdGgpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gY2xpZW50UGF0aDtcblx0fVxuXG5cdHByb3RlY3RlZCBjb252ZXJ0RGVidWdnZXJQYXRoVG9DbGllbnQoZGVidWdnZXJQYXRoOiBzdHJpbmcpOiBzdHJpbmcge1xuXHRcdGlmICh0aGlzLl9kZWJ1Z2dlclBhdGhzQXJlVVJJcyAhPT0gdGhpcy5fY2xpZW50UGF0aHNBcmVVUklzKSB7XG5cdFx0XHRpZiAodGhpcy5fZGVidWdnZXJQYXRoc0FyZVVSSXMpIHtcblx0XHRcdFx0cmV0dXJuIERlYnVnU2Vzc2lvbi51cmkycGF0aChkZWJ1Z2dlclBhdGgpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0cmV0dXJuIERlYnVnU2Vzc2lvbi5wYXRoMnVyaShkZWJ1Z2dlclBhdGgpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gZGVidWdnZXJQYXRoO1xuXHR9XG5cblx0Ly8tLS0tIHByaXZhdGUgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5cdHByaXZhdGUgc3RhdGljIHBhdGgydXJpKHBhdGg6IHN0cmluZyk6IHN0cmluZyB7XG5cblx0XHRpZiAocHJvY2Vzcy5wbGF0Zm9ybSA9PT0gJ3dpbjMyJykge1xuXHRcdFx0aWYgKC9eW0EtWl06Ly50ZXN0KHBhdGgpKSB7XG5cdFx0XHRcdHBhdGggPSBwYXRoWzBdLnRvTG93ZXJDYXNlKCkgKyBwYXRoLnN1YnN0cigxKTtcblx0XHRcdH1cblx0XHRcdHBhdGggPSBwYXRoLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcblx0XHR9XG5cdFx0cGF0aCA9IGVuY29kZVVSSShwYXRoKTtcblxuXHRcdGxldCB1cmkgPSBuZXcgVVJMKGBmaWxlOmApO1x0Ly8gaWdub3JlICdwYXRoJyBmb3Igbm93XG5cdFx0dXJpLnBhdGhuYW1lID0gcGF0aDtcdC8vIG5vdyB1c2UgJ3BhdGgnIHRvIGdldCB0aGUgY29ycmVjdCBwZXJjZW50IGVuY29kaW5nIChzZWUgaHR0cHM6Ly91cmwuc3BlYy53aGF0d2cub3JnKVxuXHRcdHJldHVybiB1cmkudG9TdHJpbmcoKTtcblx0fVxuXG5cdHByaXZhdGUgc3RhdGljIHVyaTJwYXRoKHNvdXJjZVVyaTogc3RyaW5nKTogc3RyaW5nIHtcblxuXHRcdGxldCB1cmkgPSBuZXcgVVJMKHNvdXJjZVVyaSk7XG5cdFx0bGV0IHMgPSBkZWNvZGVVUklDb21wb25lbnQodXJpLnBhdGhuYW1lKTtcblx0XHRpZiAocHJvY2Vzcy5wbGF0Zm9ybSA9PT0gJ3dpbjMyJykge1xuXHRcdFx0aWYgKC9eXFwvW2EtekEtWl06Ly50ZXN0KHMpKSB7XG5cdFx0XHRcdHMgPSBzWzFdLnRvTG93ZXJDYXNlKCkgKyBzLnN1YnN0cigyKTtcblx0XHRcdH1cblx0XHRcdHMgPSBzLnJlcGxhY2UoL1xcLy9nLCAnXFxcXCcpO1xuXHRcdH1cblx0XHRyZXR1cm4gcztcblx0fVxuXG5cdHByaXZhdGUgc3RhdGljIF9mb3JtYXRQSUlSZWdleHAgPSAveyhbXn1dKyl9L2c7XG5cblx0Lypcblx0KiBJZiBhcmd1bWVudCBzdGFydHMgd2l0aCAnXycgaXQgaXMgT0sgdG8gc2VuZCBpdHMgdmFsdWUgdG8gdGVsZW1ldHJ5LlxuXHQqL1xuXHRwcml2YXRlIHN0YXRpYyBmb3JtYXRQSUkoZm9ybWF0OnN0cmluZywgZXhjbHVkZVBJSTogYm9vbGVhbiwgYXJnczoge1trZXk6IHN0cmluZ106IHN0cmluZ30pOiBzdHJpbmcge1xuXHRcdHJldHVybiBmb3JtYXQucmVwbGFjZShEZWJ1Z1Nlc3Npb24uX2Zvcm1hdFBJSVJlZ2V4cCwgZnVuY3Rpb24obWF0Y2gsIHBhcmFtTmFtZSkge1xuXHRcdFx0aWYgKGV4Y2x1ZGVQSUkgJiYgcGFyYW1OYW1lLmxlbmd0aCA+IDAgJiYgcGFyYW1OYW1lWzBdICE9PSAnXycpIHtcblx0XHRcdFx0cmV0dXJuIG1hdGNoO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIGFyZ3NbcGFyYW1OYW1lXSAmJiBhcmdzLmhhc093blByb3BlcnR5KHBhcmFtTmFtZSkgP1xuXHRcdFx0XHRhcmdzW3BhcmFtTmFtZV0gOlxuXHRcdFx0XHRtYXRjaDtcblx0XHR9KVxuXHR9XG59XG4iXX0=

/***/ }),
/* 5 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProtocolServer = void 0;
const ee = __webpack_require__(6);
const messages_1 = __webpack_require__(7);
class Disposable0 {
    dispose() {
    }
}
class Emitter {
    get event() {
        if (!this._event) {
            this._event = (listener, thisArg) => {
                this._listener = listener;
                this._this = thisArg;
                let result;
                result = {
                    dispose: () => {
                        this._listener = undefined;
                        this._this = undefined;
                    }
                };
                return result;
            };
        }
        return this._event;
    }
    fire(event) {
        if (this._listener) {
            try {
                this._listener.call(this._this, event);
            }
            catch (e) {
            }
        }
    }
    hasListener() {
        return !!this._listener;
    }
    dispose() {
        this._listener = undefined;
        this._this = undefined;
    }
}
class ProtocolServer extends ee.EventEmitter {
    constructor() {
        super();
        this._sendMessage = new Emitter();
        this._pendingRequests = new Map();
        this.onDidSendMessage = this._sendMessage.event;
    }
    // ---- implements vscode.Debugadapter interface ---------------------------
    dispose() {
    }
    handleMessage(msg) {
        if (msg.type === 'request') {
            this.dispatchRequest(msg);
        }
        else if (msg.type === 'response') {
            const response = msg;
            const clb = this._pendingRequests.get(response.request_seq);
            if (clb) {
                this._pendingRequests.delete(response.request_seq);
                clb(response);
            }
        }
    }
    _isRunningInline() {
        return this._sendMessage && this._sendMessage.hasListener();
    }
    //--------------------------------------------------------------------------
    start(inStream, outStream) {
        this._sequence = 1;
        this._writableStream = outStream;
        this._rawData = Buffer.alloc(0);
        inStream.on('data', (data) => this._handleData(data));
        inStream.on('close', () => {
            this._emitEvent(new messages_1.Event('close'));
        });
        inStream.on('error', (error) => {
            this._emitEvent(new messages_1.Event('error', 'inStream error: ' + (error && error.message)));
        });
        outStream.on('error', (error) => {
            this._emitEvent(new messages_1.Event('error', 'outStream error: ' + (error && error.message)));
        });
        inStream.resume();
    }
    stop() {
        if (this._writableStream) {
            this._writableStream.end();
        }
    }
    sendEvent(event) {
        this._send('event', event);
    }
    sendResponse(response) {
        if (response.seq > 0) {
            console.error(`attempt to send more than one response for command ${response.command}`);
        }
        else {
            this._send('response', response);
        }
    }
    sendRequest(command, args, timeout, cb) {
        const request = {
            command: command
        };
        if (args && Object.keys(args).length > 0) {
            request.arguments = args;
        }
        this._send('request', request);
        if (cb) {
            this._pendingRequests.set(request.seq, cb);
            const timer = setTimeout(() => {
                clearTimeout(timer);
                const clb = this._pendingRequests.get(request.seq);
                if (clb) {
                    this._pendingRequests.delete(request.seq);
                    clb(new messages_1.Response(request, 'timeout'));
                }
            }, timeout);
        }
    }
    // ---- protected ----------------------------------------------------------
    dispatchRequest(request) {
    }
    // ---- private ------------------------------------------------------------
    _emitEvent(event) {
        this.emit(event.event, event);
    }
    _send(typ, message) {
        message.type = typ;
        message.seq = this._sequence++;
        if (this._writableStream) {
            const json = JSON.stringify(message);
            this._writableStream.write(`Content-Length: ${Buffer.byteLength(json, 'utf8')}\r\n\r\n${json}`, 'utf8');
        }
        this._sendMessage.fire(message);
    }
    _handleData(data) {
        this._rawData = Buffer.concat([this._rawData, data]);
        while (true) {
            if (this._contentLength >= 0) {
                if (this._rawData.length >= this._contentLength) {
                    const message = this._rawData.toString('utf8', 0, this._contentLength);
                    this._rawData = this._rawData.slice(this._contentLength);
                    this._contentLength = -1;
                    if (message.length > 0) {
                        try {
                            let msg = JSON.parse(message);
                            this.handleMessage(msg);
                        }
                        catch (e) {
                            this._emitEvent(new messages_1.Event('error', 'Error handling data: ' + (e && e.message)));
                        }
                    }
                    continue; // there may be more complete messages to process
                }
            }
            else {
                const idx = this._rawData.indexOf(ProtocolServer.TWO_CRLF);
                if (idx !== -1) {
                    const header = this._rawData.toString('utf8', 0, idx);
                    const lines = header.split('\r\n');
                    for (let i = 0; i < lines.length; i++) {
                        const pair = lines[i].split(/: +/);
                        if (pair[0] == 'Content-Length') {
                            this._contentLength = +pair[1];
                        }
                    }
                    this._rawData = this._rawData.slice(idx + ProtocolServer.TWO_CRLF.length);
                    continue;
                }
            }
            break;
        }
    }
}
exports.ProtocolServer = ProtocolServer;
ProtocolServer.TWO_CRLF = '\r\n\r\n';
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvdG9jb2wuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvcHJvdG9jb2wudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Z0dBR2dHOzs7QUFFaEcsNkJBQTZCO0FBRTdCLHlDQUE2QztBQVM3QyxNQUFNLFdBQVc7SUFDaEIsT0FBTztJQUNQLENBQUM7Q0FDRDtBQU1ELE1BQU0sT0FBTztJQU1aLElBQUksS0FBSztRQUNSLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFO1lBQ2pCLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxRQUF1QixFQUFFLE9BQWEsRUFBRSxFQUFFO2dCQUV4RCxJQUFJLENBQUMsU0FBUyxHQUFHLFFBQVEsQ0FBQztnQkFDMUIsSUFBSSxDQUFDLEtBQUssR0FBRyxPQUFPLENBQUM7Z0JBRXJCLElBQUksTUFBbUIsQ0FBQztnQkFDeEIsTUFBTSxHQUFHO29CQUNSLE9BQU8sRUFBRSxHQUFHLEVBQUU7d0JBQ2IsSUFBSSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUM7d0JBQzNCLElBQUksQ0FBQyxLQUFLLEdBQUcsU0FBUyxDQUFDO29CQUN4QixDQUFDO2lCQUNELENBQUM7Z0JBQ0YsT0FBTyxNQUFNLENBQUM7WUFDZixDQUFDLENBQUM7U0FDRjtRQUNELE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQztJQUNwQixDQUFDO0lBRUQsSUFBSSxDQUFDLEtBQVE7UUFDWixJQUFJLElBQUksQ0FBQyxTQUFTLEVBQUU7WUFDbkIsSUFBSTtnQkFDSCxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDO2FBQ3ZDO1lBQUMsT0FBTyxDQUFDLEVBQUU7YUFDWDtTQUNEO0lBQ0YsQ0FBQztJQUVELFdBQVc7UUFDVixPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDO0lBQ3pCLENBQUM7SUFFRCxPQUFPO1FBQ04sSUFBSSxDQUFDLFNBQVMs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SSxnQkFBZ0IsRUFBRTs0QkFDaEMsSUFBSSxDQUFDLGNBQWMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQzt5QkFDL0I7cUJBQ0Q7b0JBQ0QsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxHQUFHLEdBQUcsY0FBYyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQztvQkFDMUUsU0FBUztpQkFDVDthQUNEO1lBQ0QsTUFBTTtTQUNOO0lBQ0YsQ0FBQzs7QUF2S0Ysd0NBd0tDO0FBdEtlLHVCQUFRLEdBQUcsVUFBVSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAqICBDb3B5cmlnaHQgKGMpIE1pY3Jvc29mdCBDb3Jwb3JhdGlvbi4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqICBMaWNlbnNlZCB1bmRlciB0aGUgTUlUIExpY2Vuc2UuIFNlZSBMaWNlbnNlLnR4dCBpbiB0aGUgcHJvamVjdCByb290IGZvciBsaWNlbnNlIGluZm9ybWF0aW9uLlxuICotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXG5cbmltcG9ydCAqIGFzIGVlIGZyb20gJ2V2ZW50cyc7XG5pbXBvcnQgeyBEZWJ1Z1Byb3RvY29sIH0gZnJvbSAndnNjb2RlLWRlYnVncHJvdG9jb2wnO1xuaW1wb3J0IHsgUmVzcG9uc2UsIEV2ZW50IH0gZnJvbSAnLi9tZXNzYWdlcyc7XG5cbmludGVyZmFjZSBEZWJ1Z1Byb3RvY29sTWVzc2FnZSB7XG59XG5cbmludGVyZmFjZSBJRGlzcG9zYWJsZSB7XG5cdGRpc3Bvc2UoKTogdm9pZDtcbn1cblxuY2xhc3MgRGlzcG9zYWJsZTAgaW1wbGVtZW50cyBJRGlzcG9zYWJsZSB7XG5cdGRpc3Bvc2UoKTogYW55IHtcblx0fVxufVxuXG5pbnRlcmZhY2UgRXZlbnQwPFQ+IHtcblx0KGxpc3RlbmVyOiAoZTogVCkgPT4gYW55LCB0aGlzQXJnPzogYW55KTogRGlzcG9zYWJsZTA7XG59XG5cbmNsYXNzIEVtaXR0ZXI8VD4ge1xuXG5cdHByaXZhdGUgX2V2ZW50PzogRXZlbnQwPFQ+O1xuXHRwcml2YXRlIF9saXN0ZW5lcj86IChlOiBUKSA9PiB2b2lkO1xuXHRwcml2YXRlIF90aGlzPzogYW55O1xuXG5cdGdldCBldmVudCgpOiBFdmVudDA8VD4ge1xuXHRcdGlmICghdGhpcy5fZXZlbnQpIHtcblx0XHRcdHRoaXMuX2V2ZW50ID0gKGxpc3RlbmVyOiAoZTogVCkgPT4gYW55LCB0aGlzQXJnPzogYW55KSA9PiB7XG5cblx0XHRcdFx0dGhpcy5fbGlzdGVuZXIgPSBsaXN0ZW5lcjtcblx0XHRcdFx0dGhpcy5fdGhpcyA9IHRoaXNBcmc7XG5cblx0XHRcdFx0bGV0IHJlc3VsdDogSURpc3Bvc2FibGU7XG5cdFx0XHRcdHJlc3VsdCA9IHtcblx0XHRcdFx0XHRkaXNwb3NlOiAoKSA9PiB7XG5cdFx0XHRcdFx0XHR0aGlzLl9saXN0ZW5lciA9IHVuZGVmaW5lZDtcblx0XHRcdFx0XHRcdHRoaXMuX3RoaXMgPSB1bmRlZmluZWQ7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9O1xuXHRcdFx0XHRyZXR1cm4gcmVzdWx0O1xuXHRcdFx0fTtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXMuX2V2ZW50O1xuXHR9XG5cblx0ZmlyZShldmVudDogVCk6IHZvaWQge1xuXHRcdGlmICh0aGlzLl9saXN0ZW5lcikge1xuXHRcdFx0dHJ5IHtcblx0XHRcdFx0dGhpcy5fbGlzdGVuZXIuY2FsbCh0aGlzLl90aGlzLCBldmVudCk7XG5cdFx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0aGFzTGlzdGVuZXIoKSA6IGJvb2xlYW4ge1xuXHRcdHJldHVybiAhIXRoaXMuX2xpc3RlbmVyO1xuXHR9XG5cblx0ZGlzcG9zZSgpIHtcblx0XHR0aGlzLl9saXN0ZW5lciA9IHVuZGVmaW5lZDtcblx0XHR0aGlzLl90aGlzID0gdW5kZWZpbmVkO1xuXHR9XG59XG5cbi8qKlxuICogQSBzdHJ1Y3R1cmFsbHkgZXF1aXZhbGVudCBjb3B5IG9mIHZzY29kZS5EZWJ1Z0FkYXB0ZXJcbiAqL1xuaW50ZXJmYWNlIFZTQ29kZURlYnVnQWRhcHRlciBleHRlbmRzIERpc3Bvc2FibGUwIHtcblxuXHRyZWFkb25seSBvbkRpZFNlbmRNZXNzYWdlOiBFdmVudDA8RGVidWdQcm90b2NvbE1lc3NhZ2U+O1xuXG5cdGhhbmRsZU1lc3NhZ2UobWVzc2FnZTogRGVidWdQcm90b2NvbC5Qcm90b2NvbE1lc3NhZ2UpOiB2b2lkO1xufVxuXG5leHBvcnQgY2xhc3MgUHJvdG9jb2xTZXJ2ZXIgZXh0ZW5kcyBlZS5FdmVudEVtaXR0ZXIgaW1wbGVtZW50cyBWU0NvZGVEZWJ1Z0FkYXB0ZXIge1xuXG5cdHByaXZhdGUgc3RhdGljIFRXT19DUkxGID0gJ1xcclxcblxcclxcbic7XG5cblx0cHJpdmF0ZSBfc2VuZE1lc3NhZ2UgPSBuZXcgRW1pdHRlcjxEZWJ1Z1Byb3RvY29sTWVzc2FnZT4oKTtcblxuXHRwcml2YXRlIF9yYXdEYXRhOiBCdWZmZXI7XG5cdHByaXZhdGUgX2NvbnRlbnRMZW5ndGg6IG51bWJlcjtcblx0cHJpdmF0ZSBfc2VxdWVuY2U6IG51bWJlcjtcblx0cHJpdmF0ZSBfd3JpdGFibGVTdHJlYW06IE5vZGVKUy5Xcml0YWJsZVN0cmVhbTtcblx0cHJpdmF0ZSBfcGVuZGluZ1JlcXVlc3RzID0gbmV3IE1hcDxudW1iZXIsIChyZXNwb25zZTogRGVidWdQcm90b2NvbC5SZXNwb25zZSkgPT4gdm9pZD4oKTtcblxuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHRzdXBlcigpO1xuXHR9XG5cblx0Ly8gLS0tLSBpbXBsZW1lbnRzIHZzY29kZS5EZWJ1Z2FkYXB0ZXIgaW50ZXJmYWNlIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5cdHB1YmxpYyBkaXNwb3NlKCk6IGFueSB7XG5cdH1cblxuXHRwdWJsaWMgb25EaWRTZW5kTWVzc2FnZTogRXZlbnQwPERlYnVnUHJvdG9jb2xNZXNzYWdlPiA9IHRoaXMuX3NlbmRNZXNzYWdlLmV2ZW50O1xuXG5cdHB1YmxpYyBoYW5kbGVNZXNzYWdlKG1zZzogRGVidWdQcm90b2NvbC5Qcm90b2NvbE1lc3NhZ2UpOiB2b2lkIHtcblx0XHRpZiAobXNnLnR5cGUgPT09ICdyZXF1ZXN0Jykge1xuXHRcdFx0dGhpcy5kaXNwYXRjaFJlcXVlc3QoPERlYnVnUHJvdG9jb2wuUmVxdWVzdD5tc2cpO1xuXHRcdH0gZWxzZSBpZiAobXNnLnR5cGUgPT09ICdyZXNwb25zZScpIHtcblx0XHRcdGNvbnN0IHJlc3BvbnNlID0gPERlYnVnUHJvdG9jb2wuUmVzcG9uc2U+bXNnO1xuXHRcdFx0Y29uc3QgY2xiID0gdGhpcy5fcGVuZGluZ1JlcXVlc3RzLmdldChyZXNwb25zZS5yZXF1ZXN0X3NlcSk7XG5cdFx0XHRpZiAoY2xiKSB7XG5cdFx0XHRcdHRoaXMuX3BlbmRpbmdSZXF1ZXN0cy5kZWxldGUocmVzcG9uc2UucmVxdWVzdF9zZXEpO1xuXHRcdFx0XHRjbGIocmVzcG9uc2UpO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdHByb3RlY3RlZCBfaXNSdW5uaW5nSW5saW5lKCkge1xuXHRcdHJldHVybiB0aGlzLl9zZW5kTWVzc2FnZSAmJiB0aGlzLl9zZW5kTWVzc2FnZS5oYXNMaXN0ZW5lcigpO1xuXHR9XG5cblx0Ly8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5cdHB1YmxpYyBzdGFydChpblN0cmVhbTogTm9kZUpTLlJlYWRhYmxlU3RyZWFtLCBvdXRTdHJlYW06IE5vZGVKUy5Xcml0YWJsZVN0cmVhbSk6IHZvaWQge1xuXHRcdHRoaXMuX3NlcXVlbmNlID0gMTtcblx0XHR0aGlzLl93cml0YWJsZVN0cmVhbSA9IG91dFN0cmVhbTtcblx0XHR0aGlzLl9yYXdEYXRhID0gQnVmZmVyLmFsbG9jKDApO1xuXG5cdFx0aW5TdHJlYW0ub24oJ2RhdGEnLCAoZGF0YTogQnVmZmVyKSA9PiB0aGlzLl9oYW5kbGVEYXRhKGRhdGEpKTtcblxuXHRcdGluU3RyZWFtLm9uKCdjbG9zZScsICgpID0+IHtcblx0XHRcdHRoaXMuX2VtaXRFdmVudChuZXcgRXZlbnQoJ2Nsb3NlJykpO1xuXHRcdH0pO1xuXHRcdGluU3RyZWFtLm9uKCdlcnJvcicsIChlcnJvcikgPT4ge1xuXHRcdFx0dGhpcy5fZW1pdEV2ZW50KG5ldyBFdmVudCgnZXJyb3InLCAnaW5TdHJlYW0gZXJyb3I6ICcgKyAoZXJyb3IgJiYgZXJyb3IubWVzc2FnZSkpKTtcblx0XHR9KTtcblxuXHRcdG91dFN0cmVhbS5vbignZXJyb3InLCAoZXJyb3IpID0+IHtcblx0XHRcdHRoaXMuX2VtaXRFdmVudChuZXcgRXZlbnQoJ2Vycm9yJywgJ291dFN0cmVhbSBlcnJvcjogJyArIChlcnJvciAmJiBlcnJvci5tZXNzYWdlKSkpO1xuXHRcdH0pO1xuXG5cdFx0aW5TdHJlYW0ucmVzdW1lKCk7XG5cdH1cblxuXHRwdWJsaWMgc3RvcCgpOiB2b2lkIHtcblx0XHRpZiAodGhpcy5fd3JpdGFibGVTdHJlYW0pIHtcblx0XHRcdHRoaXMuX3dyaXRhYmxlU3RyZWFtLmVuZCgpO1xuXHRcdH1cblx0fVxuXG5cdHB1YmxpYyBzZW5kRXZlbnQoZXZlbnQ6IERlYnVnUHJvdG9jb2wuRXZlbnQpOiB2b2lkIHtcblx0XHR0aGlzLl9zZW5kKCdldmVudCcsIGV2ZW50KTtcblx0fVxuXG5cdHB1YmxpYyBzZW5kUmVzcG9uc2UocmVzcG9uc2U6IERlYnVnUHJvdG9jb2wuUmVzcG9uc2UpOiB2b2lkIHtcblx0XHRpZiAocmVzcG9uc2Uuc2VxID4gMCkge1xuXHRcdFx0Y29uc29sZS5lcnJvcihgYXR0ZW1wdCB0byBzZW5kIG1vcmUgdGhhbiBvbmUgcmVzcG9uc2UgZm9yIGNvbW1hbmQgJHtyZXNwb25zZS5jb21tYW5kfWApO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aGlzLl9zZW5kKCdyZXNwb25zZScsIHJlc3BvbnNlKTtcblx0XHR9XG5cdH1cblxuXHRwdWJsaWMgc2VuZFJlcXVlc3QoY29tbWFuZDogc3RyaW5nLCBhcmdzOiBhbnksIHRpbWVvdXQ6IG51bWJlciwgY2I6IChyZXNwb25zZTogRGVidWdQcm90b2NvbC5SZXNwb25zZSkgPT4gdm9pZCkgOiB2b2lkIHtcblxuXHRcdGNvbnN0IHJlcXVlc3Q6IGFueSA9IHtcblx0XHRcdGNvbW1hbmQ6IGNvbW1hbmRcblx0XHR9O1xuXHRcdGlmIChhcmdzICYmIE9iamVjdC5rZXlzKGFyZ3MpLmxlbmd0aCA+IDApIHtcblx0XHRcdHJlcXVlc3QuYXJndW1lbnRzID0gYXJncztcblx0XHR9XG5cblx0XHR0aGlzLl9zZW5kKCdyZXF1ZXN0JywgcmVxdWVzdCk7XG5cblx0XHRpZiAoY2IpIHtcblx0XHRcdHRoaXMuX3BlbmRpbmdSZXF1ZXN0cy5zZXQocmVxdWVzdC5zZXEsIGNiKTtcblxuXHRcdFx0Y29uc3QgdGltZXIgPSBzZXRUaW1lb3V0KCgpID0+IHtcblx0XHRcdFx0Y2xlYXJUaW1lb3V0KHRpbWVyKTtcblx0XHRcdFx0Y29uc3QgY2xiID0gdGhpcy5fcGVuZGluZ1JlcXVlc3RzLmdldChyZXF1ZXN0LnNlcSk7XG5cdFx0XHRcdGlmIChjbGIpIHtcblx0XHRcdFx0XHR0aGlzLl9wZW5kaW5nUmVxdWVzdHMuZGVsZXRlKHJlcXVlc3Quc2VxKTtcblx0XHRcdFx0XHRjbGIobmV3IFJlc3BvbnNlKHJlcXVlc3QsICd0aW1lb3V0JykpO1xuXHRcdFx0XHR9XG5cdFx0XHR9LCB0aW1lb3V0KTtcblx0XHR9XG5cdH1cblxuXHQvLyAtLS0tIHByb3RlY3RlZCAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cblx0cHJvdGVjdGVkIGRpc3BhdGNoUmVxdWVzdChyZXF1ZXN0OiBEZWJ1Z1Byb3RvY29sLlJlcXVlc3QpOiB2b2lkIHtcblx0fVxuXG5cdC8vIC0tLS0gcHJpdmF0ZSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuXHRwcml2YXRlIF9lbWl0RXZlbnQoZXZlbnQ6IERlYnVnUHJvdG9jb2wuRXZlbnQpIHtcblx0XHR0aGlzLmVtaXQoZXZlbnQuZXZlbnQsIGV2ZW50KTtcblx0fVxuXG5cdHByaXZhdGUgX3NlbmQodHlwOiAncmVxdWVzdCcgfCAncmVzcG9uc2UnIHwgJ2V2ZW50JywgbWVzc2FnZTogRGVidWdQcm90b2NvbC5Qcm90b2NvbE1lc3NhZ2UpOiB2b2lkIHtcblxuXHRcdG1lc3NhZ2UudHlwZSA9IHR5cDtcblx0XHRtZXNzYWdlLnNlcSA9IHRoaXMuX3NlcXVlbmNlKys7XG5cblx0XHRpZiAodGhpcy5fd3JpdGFibGVTdHJlYW0pIHtcblx0XHRcdGNvbnN0IGpzb24gPSBKU09OLnN0cmluZ2lmeShtZXNzYWdlKTtcblx0XHRcdHRoaXMuX3dyaXRhYmxlU3RyZWFtLndyaXRlKGBDb250ZW50LUxlbmd0aDogJHtCdWZmZXIuYnl0ZUxlbmd0aChqc29uLCAndXRmOCcpfVxcclxcblxcclxcbiR7anNvbn1gLCAndXRmOCcpO1xuXHRcdH1cblx0XHR0aGlzLl9zZW5kTWVzc2FnZS5maXJlKG1lc3NhZ2UpO1xuXHR9XG5cblx0cHJpdmF0ZSBfaGFuZGxlRGF0YShkYXRhOiBCdWZmZXIpOiB2b2lkIHtcblxuXHRcdHRoaXMuX3Jhd0RhdGEgPSBCdWZmZXIuY29uY2F0KFt0aGlzLl9yYXdEYXRhLCBkYXRhXSk7XG5cblx0XHR3aGlsZSAodHJ1ZSkge1xuXHRcdFx0aWYgKHRoaXMuX2NvbnRlbnRMZW5ndGggPj0gMCkge1xuXHRcdFx0XHRpZiAodGhpcy5fcmF3RGF0YS5sZW5ndGggPj0gdGhpcy5fY29udGVudExlbmd0aCkge1xuXHRcdFx0XHRcdGNvbnN0IG1lc3NhZ2UgPSB0aGlzLl9yYXdEYXRhLnRvU3RyaW5nKCd1dGY4JywgMCwgdGhpcy5fY29udGVudExlbmd0aCk7XG5cdFx0XHRcdFx0dGhpcy5fcmF3RGF0YSA9IHRoaXMuX3Jhd0RhdGEuc2xpY2UodGhpcy5fY29udGVudExlbmd0aCk7XG5cdFx0XHRcdFx0dGhpcy5fY29udGVudExlbmd0aCA9IC0xO1xuXHRcdFx0XHRcdGlmIChtZXNzYWdlLmxlbmd0aCA+IDApIHtcblx0XHRcdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0XHRcdGxldCBtc2c6IERlYnVnUHJvdG9jb2wuUHJvdG9jb2xNZXNzYWdlID0gSlNPTi5wYXJzZShtZXNzYWdlKTtcblx0XHRcdFx0XHRcdFx0dGhpcy5oYW5kbGVNZXNzYWdlKG1zZyk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRjYXRjaCAoZSkge1xuXHRcdFx0XHRcdFx0XHR0aGlzLl9lbWl0RXZlbnQobmV3IEV2ZW50KCdlcnJvcicsICdFcnJvciBoYW5kbGluZyBkYXRhOiAnICsgKGUgJiYgZS5tZXNzYWdlKSkpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRjb250aW51ZTtcdC8vIHRoZXJlIG1heSBiZSBtb3JlIGNvbXBsZXRlIG1lc3NhZ2VzIHRvIHByb2Nlc3Ncblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Y29uc3QgaWR4ID0gdGhpcy5fcmF3RGF0YS5pbmRleE9mKFByb3RvY29sU2VydmVyLlRXT19DUkxGKTtcblx0XHRcdFx0aWYgKGlkeCAhPT0gLTEpIHtcblx0XHRcdFx0XHRjb25zdCBoZWFkZXIgPSB0aGlzLl9yYXdEYXRhLnRvU3RyaW5nKCd1dGY4JywgMCwgaWR4KTtcblx0XHRcdFx0XHRjb25zdCBsaW5lcyA9IGhlYWRlci5zcGxpdCgnXFxyXFxuJyk7XG5cdFx0XHRcdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCBsaW5lcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRcdFx0Y29uc3QgcGFpciA9IGxpbmVzW2ldLnNwbGl0KC86ICsvKTtcblx0XHRcdFx0XHRcdGlmIChwYWlyWzBdID09ICdDb250ZW50LUxlbmd0aCcpIHtcblx0XHRcdFx0XHRcdFx0dGhpcy5fY29udGVudExlbmd0aCA9ICtwYWlyWzFdO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHR0aGlzLl9yYXdEYXRhID0gdGhpcy5fcmF3RGF0YS5zbGljZShpZHggKyBQcm90b2NvbFNlcnZlci5UV09fQ1JMRi5sZW5ndGgpO1xuXHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRicmVhaztcblx0XHR9XG5cdH1cbn1cbiJdfQ==

/***/ }),
/* 6 */
/***/ (function(module, exports) {

module.exports = require("events");

/***/ }),
/* 7 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.Event = exports.Response = exports.Message = void 0;
class Message {
    constructor(type) {
        this.seq = 0;
        this.type = type;
    }
}
exports.Message = Message;
class Response extends Message {
    constructor(request, message) {
        super('response');
        this.request_seq = request.seq;
        this.command = request.command;
        if (message) {
            this.success = false;
            this.message = message;
        }
        else {
            this.success = true;
        }
    }
}
exports.Response = Response;
class Event extends Message {
    constructor(event, body) {
        super('event');
        this.event = event;
        if (body) {
            this.body = body;
        }
    }
}
exports.Event = Event;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVzc2FnZXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvbWVzc2FnZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Z0dBR2dHOzs7QUFLaEcsTUFBYSxPQUFPO0lBSW5CLFlBQW1CLElBQVk7UUFDOUIsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUM7UUFDYixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztJQUNsQixDQUFDO0NBQ0Q7QUFSRCwwQkFRQztBQUVELE1BQWEsUUFBUyxTQUFRLE9BQU87SUFLcEMsWUFBbUIsT0FBOEIsRUFBRSxPQUFnQjtRQUNsRSxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDbEIsSUFBSSxDQUFDLFdBQVcsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDO1FBQy9CLElBQUksQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQztRQUMvQixJQUFJLE9BQU8sRUFBRTtZQUNaLElBQUksQ0FBQyxPQUFPLEdBQUcsS0FBSyxDQUFDO1lBQ2YsSUFBSyxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7U0FDOUI7YUFBTTtZQUNOLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDO1NBQ3BCO0lBQ0YsQ0FBQztDQUNEO0FBaEJELDRCQWdCQztBQUVELE1BQWEsS0FBTSxTQUFRLE9BQU87SUFHakMsWUFBbUIsS0FBYSxFQUFFLElBQVU7UUFDM0MsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ2YsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7UUFDbkIsSUFBSSxJQUFJLEVBQUU7WUFDSCxJQUFLLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztTQUN4QjtJQUNGLENBQUM7Q0FDRDtBQVZELHNCQVVDIiwic291cmNlc0NvbnRlbnQiOlsiLyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAqICBDb3B5cmlnaHQgKGMpIE1pY3Jvc29mdCBDb3Jwb3JhdGlvbi4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqICBMaWNlbnNlZCB1bmRlciB0aGUgTUlUIExpY2Vuc2UuIFNlZSBMaWNlbnNlLnR4dCBpbiB0aGUgcHJvamVjdCByb290IGZvciBsaWNlbnNlIGluZm9ybWF0aW9uLlxuICotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXG5cbmltcG9ydCB7IERlYnVnUHJvdG9jb2wgfSBmcm9tICd2c2NvZGUtZGVidWdwcm90b2NvbCc7XG5cblxuZXhwb3J0IGNsYXNzIE1lc3NhZ2UgaW1wbGVtZW50cyBEZWJ1Z1Byb3RvY29sLlByb3RvY29sTWVzc2FnZSB7XG5cdHNlcTogbnVtYmVyO1xuXHR0eXBlOiBzdHJpbmc7XG5cblx0cHVibGljIGNvbnN0cnVjdG9yKHR5cGU6IHN0cmluZykge1xuXHRcdHRoaXMuc2VxID0gMDtcblx0XHR0aGlzLnR5cGUgPSB0eXBlO1xuXHR9XG59XG5cbmV4cG9ydCBjbGFzcyBSZXNwb25zZSBleHRlbmRzIE1lc3NhZ2UgaW1wbGVtZW50cyBEZWJ1Z1Byb3RvY29sLlJlc3BvbnNlIHtcblx0cmVxdWVzdF9zZXE6IG51bWJlcjtcblx0c3VjY2VzczogYm9vbGVhbjtcblx0Y29tbWFuZDogc3RyaW5nO1xuXG5cdHB1YmxpYyBjb25zdHJ1Y3RvcihyZXF1ZXN0OiBEZWJ1Z1Byb3RvY29sLlJlcXVlc3QsIG1lc3NhZ2U/OiBzdHJpbmcpIHtcblx0XHRzdXBlcigncmVzcG9uc2UnKTtcblx0XHR0aGlzLnJlcXVlc3Rfc2VxID0gcmVxdWVzdC5zZXE7XG5cdFx0dGhpcy5jb21tYW5kID0gcmVxdWVzdC5jb21tYW5kO1xuXHRcdGlmIChtZXNzYWdlKSB7XG5cdFx0XHR0aGlzLnN1Y2Nlc3MgPSBmYWxzZTtcblx0XHRcdCg8YW55PnRoaXMpLm1lc3NhZ2UgPSBtZXNzYWdlO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aGlzLnN1Y2Nlc3MgPSB0cnVlO1xuXHRcdH1cblx0fVxufVxuXG5leHBvcnQgY2xhc3MgRXZlbnQgZXh0ZW5kcyBNZXNzYWdlIGltcGxlbWVudHMgRGVidWdQcm90b2NvbC5FdmVudCB7XG5cdGV2ZW50OiBzdHJpbmc7XG5cblx0cHVibGljIGNvbnN0cnVjdG9yKGV2ZW50OiBzdHJpbmcsIGJvZHk/OiBhbnkpIHtcblx0XHRzdXBlcignZXZlbnQnKTtcblx0XHR0aGlzLmV2ZW50ID0gZXZlbnQ7XG5cdFx0aWYgKGJvZHkpIHtcblx0XHRcdCg8YW55PnRoaXMpLmJvZHkgPSBib2R5O1xuXHRcdH1cblx0fVxufVxuIl19

/***/ }),
/* 8 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.runDebugAdapter = void 0;
const Net = __webpack_require__(9);
function runDebugAdapter(debugSession) {
    // parse arguments
    let port = 0;
    const args = process.argv.slice(2);
    args.forEach(function (val, index, array) {
        const portMatch = /^--server=(\d{4,5})$/.exec(val);
        if (portMatch) {
            port = parseInt(portMatch[1], 10);
        }
    });
    if (port > 0) {
        // start as a server
        console.error(`waiting for debug protocol on port ${port}`);
        Net.createServer((socket) => {
            console.error('>> accepted connection from client');
            socket.on('end', () => {
                console.error('>> client connection closed\n');
            });
            const session = new debugSession(false, true);
            session.setRunAsServer(true);
            session.start(socket, socket);
        }).listen(port);
    }
    else {
        // start a session
        //console.error('waiting for debug protocol on stdin/stdout');
        const session = new debugSession(false);
        process.on('SIGTERM', () => {
            session.shutdown();
        });
        session.start(process.stdin, process.stdout);
    }
}
exports.runDebugAdapter = runDebugAdapter;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVuRGVidWdBZGFwdGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL3J1bkRlYnVnQWRhcHRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7OztnR0FHZ0c7OztBQUVoRywyQkFBMkI7QUFJM0IsU0FBZ0IsZUFBZSxDQUFDLFlBQWlDO0lBRWhFLGtCQUFrQjtJQUNsQixJQUFJLElBQUksR0FBRyxDQUFDLENBQUM7SUFDYixNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNuQyxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsR0FBRyxFQUFFLEtBQUssRUFBRSxLQUFLO1FBQ3ZDLE1BQU0sU0FBUyxHQUFHLHNCQUFzQixDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNuRCxJQUFJLFNBQVMsRUFBRTtZQUNkLElBQUksR0FBRyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1NBQ2xDO0lBQ0YsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLElBQUksR0FBRyxDQUFDLEVBQUU7UUFDYixvQkFBb0I7UUFDcEIsT0FBTyxDQUFDLEtBQUssQ0FBQyxzQ0FBc0MsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUM1RCxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUU7WUFDM0IsT0FBTyxDQUFDLEtBQUssQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDO1lBQ3BELE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBSyxFQUFFLEdBQUcsRUFBRTtnQkFDckIsT0FBTyxDQUFDLEtBQUssQ0FBQywrQkFBK0IsQ0FBQyxDQUFDO1lBQ2hELENBQUMsQ0FBQyxDQUFDO1lBQ0gsTUFBTSxPQUFPLEdBQUcsSUFBSSxZQUFZLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQzlDLE9BQU8sQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDN0IsT0FBTyxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDL0IsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO0tBQ2hCO1NBQU07UUFFTixrQkFBa0I7UUFDbEIsOERBQThEO1FBQzlELE1BQU0sT0FBTyxHQUFHLElBQUksWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3hDLE9BQU8sQ0FBQyxFQUFFLENBQUMsU0FBUyxFQUFFLEdBQUcsRUFBRTtZQUMxQixPQUFPLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDcEIsQ0FBQyxDQUFDLENBQUM7UUFDSCxPQUFPLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0tBQzdDO0FBQ0YsQ0FBQztBQWxDRCwwQ0FrQ0MiLCJzb3VyY2VzQ29udGVudCI6WyIvKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICogIENvcHlyaWdodCAoYykgTWljcm9zb2Z0IENvcnBvcmF0aW9uLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICogIExpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgTGljZW5zZS4gU2VlIExpY2Vuc2UudHh0IGluIHRoZSBwcm9qZWN0IHJvb3QgZm9yIGxpY2Vuc2UgaW5mb3JtYXRpb24uXG4gKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi9cblxuaW1wb3J0ICogYXMgTmV0IGZyb20gJ25ldCc7XG5cbmltcG9ydCB7IERlYnVnU2Vzc2lvbiB9IGZyb20gJy4vZGVidWdTZXNzaW9uJztcblxuZXhwb3J0IGZ1bmN0aW9uIHJ1bkRlYnVnQWRhcHRlcihkZWJ1Z1Nlc3Npb246IHR5cGVvZiBEZWJ1Z1Nlc3Npb24pIHtcblxuXHQvLyBwYXJzZSBhcmd1bWVudHNcblx0bGV0IHBvcnQgPSAwO1xuXHRjb25zdCBhcmdzID0gcHJvY2Vzcy5hcmd2LnNsaWNlKDIpO1xuXHRhcmdzLmZvckVhY2goZnVuY3Rpb24gKHZhbCwgaW5kZXgsIGFycmF5KSB7XG5cdFx0Y29uc3QgcG9ydE1hdGNoID0gL14tLXNlcnZlcj0oXFxkezQsNX0pJC8uZXhlYyh2YWwpO1xuXHRcdGlmIChwb3J0TWF0Y2gpIHtcblx0XHRcdHBvcnQgPSBwYXJzZUludChwb3J0TWF0Y2hbMV0sIDEwKTtcblx0XHR9XG5cdH0pO1xuXG5cdGlmIChwb3J0ID4gMCkge1xuXHRcdC8vIHN0YXJ0IGFzIGEgc2VydmVyXG5cdFx0Y29uc29sZS5lcnJvcihgd2FpdGluZyBmb3IgZGVidWcgcHJvdG9jb2wgb24gcG9ydCAke3BvcnR9YCk7XG5cdFx0TmV0LmNyZWF0ZVNlcnZlcigoc29ja2V0KSA9PiB7XG5cdFx0XHRjb25zb2xlLmVycm9yKCc+PiBhY2NlcHRlZCBjb25uZWN0aW9uIGZyb20gY2xpZW50Jyk7XG5cdFx0XHRzb2NrZXQub24oJ2VuZCcsICgpID0+IHtcblx0XHRcdFx0Y29uc29sZS5lcnJvcignPj4gY2xpZW50IGNvbm5lY3Rpb24gY2xvc2VkXFxuJyk7XG5cdFx0XHR9KTtcblx0XHRcdGNvbnN0IHNlc3Npb24gPSBuZXcgZGVidWdTZXNzaW9uKGZhbHNlLCB0cnVlKTtcblx0XHRcdHNlc3Npb24uc2V0UnVuQXNTZXJ2ZXIodHJ1ZSk7XG5cdFx0XHRzZXNzaW9uLnN0YXJ0KHNvY2tldCwgc29ja2V0KTtcblx0XHR9KS5saXN0ZW4ocG9ydCk7XG5cdH0gZWxzZSB7XG5cblx0XHQvLyBzdGFydCBhIHNlc3Npb25cblx0XHQvL2NvbnNvbGUuZXJyb3IoJ3dhaXRpbmcgZm9yIGRlYnVnIHByb3RvY29sIG9uIHN0ZGluL3N0ZG91dCcpO1xuXHRcdGNvbnN0IHNlc3Npb24gPSBuZXcgZGVidWdTZXNzaW9uKGZhbHNlKTtcblx0XHRwcm9jZXNzLm9uKCdTSUdURVJNJywgKCkgPT4ge1xuXHRcdFx0c2Vzc2lvbi5zaHV0ZG93bigpO1xuXHRcdH0pO1xuXHRcdHNlc3Npb24uc3RhcnQocHJvY2Vzcy5zdGRpbiwgcHJvY2Vzcy5zdGRvdXQpO1xuXHR9XG59XG4iXX0=

/***/ }),
/* 9 */
/***/ (function(module, exports) {

module.exports = require("net");

/***/ }),
/* 10 */
/***/ (function(module, exports) {

module.exports = require("url");

/***/ }),
/* 11 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoggingDebugSession = void 0;
const Logger = __webpack_require__(12);
const logger = Logger.logger;
const debugSession_1 = __webpack_require__(4);
class LoggingDebugSession extends debugSession_1.DebugSession {
    constructor(obsolete_logFilePath, obsolete_debuggerLinesAndColumnsStartAt1, obsolete_isServer) {
        super(obsolete_debuggerLinesAndColumnsStartAt1, obsolete_isServer);
        this.obsolete_logFilePath = obsolete_logFilePath;
        this.on('error', (event) => {
            logger.error(event.body);
        });
    }
    start(inStream, outStream) {
        super.start(inStream, outStream);
        logger.init(e => this.sendEvent(e), this.obsolete_logFilePath, this._isServer);
    }
    /**
     * Overload sendEvent to log
     */
    sendEvent(event) {
        if (!(event instanceof Logger.LogOutputEvent)) {
            // Don't create an infinite loop...
            let objectToLog = event;
            if (event instanceof debugSession_1.OutputEvent && event.body && event.body.data && event.body.data.doNotLogOutput) {
                delete event.body.data.doNotLogOutput;
                objectToLog = Object.assign({}, event);
                objectToLog.body = Object.assign(Object.assign({}, event.body), { output: '<output not logged>' });
            }
            logger.verbose(`To client: ${JSON.stringify(objectToLog)}`);
        }
        super.sendEvent(event);
    }
    /**
     * Overload sendRequest to log
     */
    sendRequest(command, args, timeout, cb) {
        logger.verbose(`To client: ${JSON.stringify(command)}(${JSON.stringify(args)}), timeout: ${timeout}`);
        super.sendRequest(command, args, timeout, cb);
    }
    /**
     * Overload sendResponse to log
     */
    sendResponse(response) {
        logger.verbose(`To client: ${JSON.stringify(response)}`);
        super.sendResponse(response);
    }
    dispatchRequest(request) {
        logger.verbose(`From client: ${request.command}(${JSON.stringify(request.arguments)})`);
        super.dispatchRequest(request);
    }
}
exports.LoggingDebugSession = LoggingDebugSession;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9nZ2luZ0RlYnVnU2Vzc2lvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9sb2dnaW5nRGVidWdTZXNzaW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7O2dHQUdnRzs7O0FBSWhHLG1DQUFtQztBQUNuQyxNQUFNLE1BQU0sR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDO0FBQzdCLGlEQUF5RDtBQUV6RCxNQUFhLG1CQUFvQixTQUFRLDJCQUFZO0lBQ3BELFlBQTJCLG9CQUE2QixFQUFFLHdDQUFrRCxFQUFFLGlCQUEyQjtRQUN4SSxLQUFLLENBQUMsd0NBQXdDLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztRQUR6Qyx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQVM7UUFHdkQsSUFBSSxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxLQUEwQixFQUFFLEVBQUU7WUFDL0MsTUFBTSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDMUIsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0lBRU0sS0FBSyxDQUFDLFFBQStCLEVBQUUsU0FBZ0M7UUFDN0UsS0FBSyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDakMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLG9CQUFvQixFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUNoRixDQUFDO0lBRUQ7O09BRUc7SUFDSSxTQUFTLENBQUMsS0FBMEI7UUFDMUMsSUFBSSxDQUFDLENBQUMsS0FBSyxZQUFZLE1BQU0sQ0FBQyxjQUFjLENBQUMsRUFBRTtZQUM5QyxtQ0FBbUM7WUFFbkMsSUFBSSxXQUFXLEdBQUcsS0FBSyxDQUFDO1lBQ3hCLElBQUksS0FBSyxZQUFZLDBCQUFXLElBQUksS0FBSyxDQUFDLElBQUksSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUU7Z0JBQ3BHLE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDO2dCQUN0QyxXQUFXLHFCQUFRLEtBQUssQ0FBRSxDQUFDO2dCQUMzQixXQUFXLENBQUMsSUFBSSxtQ0FBUSxLQUFLLENBQUMsSUFBSSxLQUFFLE1BQU0sRUFBRSxxQkFBcUIsR0FBRSxDQUFBO2FBQ25FO1lBRUQsTUFBTSxDQUFDLE9BQU8sQ0FBQyxjQUFjLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1NBQzVEO1FBRUQsS0FBSyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUN4QixDQUFDO0lBRUQ7O09BRUc7SUFDSSxXQUFXLENBQUMsT0FBZSxFQUFFLElBQVMsRUFBRSxPQUFlLEVBQUUsRUFBOEM7UUFDN0csTUFBTSxDQUFDLE9BQU8sQ0FBQyxjQUFjLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsZUFBZSxPQUFPLEVBQUUsQ0FBQyxDQUFDO1FBQ3RHLEtBQUssQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDL0MsQ0FBQztJQUVEOztPQUVHO0lBQ0ksWUFBWSxDQUFDLFFBQWdDO1FBQ25ELE1BQU0sQ0FBQyxPQUFPLENBQUMsY0FBYyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUN6RCxLQUFLLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQzlCLENBQUM7SUFFUyxlQUFlLENBQUMsT0FBOEI7UUFDdkQsTUFBTSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsT0FBTyxDQUFDLE9BQU8sSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUUsR0FBRyxDQUFDLENBQUM7UUFDekYsS0FBSyxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUNoQyxDQUFDO0NBQ0Q7QUF0REQsa0RBc0RDIiwic291cmNlc0NvbnRlbnQiOlsiLyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAqICBDb3B5cmlnaHQgKGMpIE1pY3Jvc29mdCBDb3Jwb3JhdGlvbi4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqICBMaWNlbnNlZCB1bmRlciB0aGUgTUlUIExpY2Vuc2UuIFNlZSBMaWNlbnNlLnR4dCBpbiB0aGUgcHJvamVjdCByb290IGZvciBsaWNlbnNlIGluZm9ybWF0aW9uLlxuICotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXG5cbmltcG9ydCB7RGVidWdQcm90b2NvbH0gZnJvbSAndnNjb2RlLWRlYnVncHJvdG9jb2wnO1xuXG5pbXBvcnQgKiBhcyBMb2dnZXIgZnJvbSAnLi9sb2dnZXInO1xuY29uc3QgbG9nZ2VyID0gTG9nZ2VyLmxvZ2dlcjtcbmltcG9ydCB7RGVidWdTZXNzaW9uLCBPdXRwdXRFdmVudH0gZnJvbSAnLi9kZWJ1Z1Nlc3Npb24nO1xuXG5leHBvcnQgY2xhc3MgTG9nZ2luZ0RlYnVnU2Vzc2lvbiBleHRlbmRzIERlYnVnU2Vzc2lvbiB7XG5cdHB1YmxpYyBjb25zdHJ1Y3Rvcihwcml2YXRlIG9ic29sZXRlX2xvZ0ZpbGVQYXRoPzogc3RyaW5nLCBvYnNvbGV0ZV9kZWJ1Z2dlckxpbmVzQW5kQ29sdW1uc1N0YXJ0QXQxPzogYm9vbGVhbiwgb2Jzb2xldGVfaXNTZXJ2ZXI/OiBib29sZWFuKSB7XG5cdFx0c3VwZXIob2Jzb2xldGVfZGVidWdnZXJMaW5lc0FuZENvbHVtbnNTdGFydEF0MSwgb2Jzb2xldGVfaXNTZXJ2ZXIpO1xuXG5cdFx0dGhpcy5vbignZXJyb3InLCAoZXZlbnQ6IERlYnVnUHJvdG9jb2wuRXZlbnQpID0+IHtcblx0XHRcdGxvZ2dlci5lcnJvcihldmVudC5ib2R5KTtcblx0XHR9KTtcblx0fVxuXG5cdHB1YmxpYyBzdGFydChpblN0cmVhbTogTm9kZUpTLlJlYWRhYmxlU3RyZWFtLCBvdXRTdHJlYW06IE5vZGVKUy5Xcml0YWJsZVN0cmVhbSk6IHZvaWQge1xuXHRcdHN1cGVyLnN0YXJ0KGluU3RyZWFtLCBvdXRTdHJlYW0pO1xuXHRcdGxvZ2dlci5pbml0KGUgPT4gdGhpcy5zZW5kRXZlbnQoZSksIHRoaXMub2Jzb2xldGVfbG9nRmlsZVBhdGgsIHRoaXMuX2lzU2VydmVyKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBPdmVybG9hZCBzZW5kRXZlbnQgdG8gbG9nXG5cdCAqL1xuXHRwdWJsaWMgc2VuZEV2ZW50KGV2ZW50OiBEZWJ1Z1Byb3RvY29sLkV2ZW50KTogdm9pZCB7XG5cdFx0aWYgKCEoZXZlbnQgaW5zdGFuY2VvZiBMb2dnZXIuTG9nT3V0cHV0RXZlbnQpKSB7XG5cdFx0XHQvLyBEb24ndCBjcmVhdGUgYW4gaW5maW5pdGUgbG9vcC4uLlxuXG5cdFx0XHRsZXQgb2JqZWN0VG9Mb2cgPSBldmVudDtcblx0XHRcdGlmIChldmVudCBpbnN0YW5jZW9mIE91dHB1dEV2ZW50ICYmIGV2ZW50LmJvZHkgJiYgZXZlbnQuYm9keS5kYXRhICYmIGV2ZW50LmJvZHkuZGF0YS5kb05vdExvZ091dHB1dCkge1xuXHRcdFx0XHRkZWxldGUgZXZlbnQuYm9keS5kYXRhLmRvTm90TG9nT3V0cHV0O1xuXHRcdFx0XHRvYmplY3RUb0xvZyA9IHsgLi4uZXZlbnQgfTtcblx0XHRcdFx0b2JqZWN0VG9Mb2cuYm9keSA9IHsgLi4uZXZlbnQuYm9keSwgb3V0cHV0OiAnPG91dHB1dCBub3QgbG9nZ2VkPicgfVxuXHRcdFx0fVxuXG5cdFx0XHRsb2dnZXIudmVyYm9zZShgVG8gY2xpZW50OiAke0pTT04uc3RyaW5naWZ5KG9iamVjdFRvTG9nKX1gKTtcblx0XHR9XG5cblx0XHRzdXBlci5zZW5kRXZlbnQoZXZlbnQpO1xuXHR9XG5cblx0LyoqXG5cdCAqIE92ZXJsb2FkIHNlbmRSZXF1ZXN0IHRvIGxvZ1xuXHQgKi9cblx0cHVibGljIHNlbmRSZXF1ZXN0KGNvbW1hbmQ6IHN0cmluZywgYXJnczogYW55LCB0aW1lb3V0OiBudW1iZXIsIGNiOiAocmVzcG9uc2U6IERlYnVnUHJvdG9jb2wuUmVzcG9uc2UpID0+IHZvaWQpOiB2b2lkIHtcblx0XHRsb2dnZXIudmVyYm9zZShgVG8gY2xpZW50OiAke0pTT04uc3RyaW5naWZ5KGNvbW1hbmQpfSgke0pTT04uc3RyaW5naWZ5KGFyZ3MpfSksIHRpbWVvdXQ6ICR7dGltZW91dH1gKTtcblx0XHRzdXBlci5zZW5kUmVxdWVzdChjb21tYW5kLCBhcmdzLCB0aW1lb3V0LCBjYik7XG5cdH1cblxuXHQvKipcblx0ICogT3ZlcmxvYWQgc2VuZFJlc3BvbnNlIHRvIGxvZ1xuXHQgKi9cblx0cHVibGljIHNlbmRSZXNwb25zZShyZXNwb25zZTogRGVidWdQcm90b2NvbC5SZXNwb25zZSk6IHZvaWQge1xuXHRcdGxvZ2dlci52ZXJib3NlKGBUbyBjbGllbnQ6ICR7SlNPTi5zdHJpbmdpZnkocmVzcG9uc2UpfWApO1xuXHRcdHN1cGVyLnNlbmRSZXNwb25zZShyZXNwb25zZSk7XG5cdH1cblxuXHRwcm90ZWN0ZWQgZGlzcGF0Y2hSZXF1ZXN0KHJlcXVlc3Q6IERlYnVnUHJvdG9jb2wuUmVxdWVzdCk6IHZvaWQge1xuXHRcdGxvZ2dlci52ZXJib3NlKGBGcm9tIGNsaWVudDogJHtyZXF1ZXN0LmNvbW1hbmR9KCR7SlNPTi5zdHJpbmdpZnkocmVxdWVzdC5hcmd1bWVudHMpIH0pYCk7XG5cdFx0c3VwZXIuZGlzcGF0Y2hSZXF1ZXN0KHJlcXVlc3QpO1xuXHR9XG59XG4iXX0=

/***/ }),
/* 12 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.trimLastNewline = exports.LogOutputEvent = exports.logger = exports.Logger = exports.LogLevel = void 0;
const internalLogger_1 = __webpack_require__(13);
const debugSession_1 = __webpack_require__(4);
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["Verbose"] = 0] = "Verbose";
    LogLevel[LogLevel["Log"] = 1] = "Log";
    LogLevel[LogLevel["Warn"] = 2] = "Warn";
    LogLevel[LogLevel["Error"] = 3] = "Error";
    LogLevel[LogLevel["Stop"] = 4] = "Stop";
})(LogLevel = exports.LogLevel || (exports.LogLevel = {}));
class Logger {
    constructor() {
        this._pendingLogQ = [];
    }
    log(msg, level = LogLevel.Log) {
        msg = msg + '\n';
        this._write(msg, level);
    }
    verbose(msg) {
        this.log(msg, LogLevel.Verbose);
    }
    warn(msg) {
        this.log(msg, LogLevel.Warn);
    }
    error(msg) {
        this.log(msg, LogLevel.Error);
    }
    dispose() {
        if (this._currentLogger) {
            const disposeP = this._currentLogger.dispose();
            this._currentLogger = null;
            return disposeP;
        }
        else {
            return Promise.resolve();
        }
    }
    /**
     * `log` adds a newline, `write` doesn't
     */
    _write(msg, level = LogLevel.Log) {
        // [null, undefined] => string
        msg = msg + '';
        if (this._pendingLogQ) {
            this._pendingLogQ.push({ msg, level });
        }
        else if (this._currentLogger) {
            this._currentLogger.log(msg, level);
        }
    }
    /**
     * Set the logger's minimum level to log in the console, and whether to log to the file. Log messages are queued before this is
     * called the first time, because minLogLevel defaults to Warn.
     */
    setup(consoleMinLogLevel, _logFilePath, prependTimestamp = true) {
        const logFilePath = typeof _logFilePath === 'string' ?
            _logFilePath :
            (_logFilePath && this._logFilePathFromInit);
        if (this._currentLogger) {
            const options = {
                consoleMinLogLevel,
                logFilePath,
                prependTimestamp
            };
            this._currentLogger.setup(options).then(() => {
                // Now that we have a minimum logLevel, we can clear out the queue of pending messages
                if (this._pendingLogQ) {
                    const logQ = this._pendingLogQ;
                    this._pendingLogQ = null;
                    logQ.forEach(item => this._write(item.msg, item.level));
                }
            });
        }
    }
    init(logCallback, logFilePath, logToConsole) {
        // Re-init, create new global Logger
        this._pendingLogQ = this._pendingLogQ || [];
        this._currentLogger = new internalLogger_1.InternalLogger(logCallback, logToConsole);
        this._logFilePathFromInit = logFilePath;
    }
}
exports.Logger = Logger;
exports.logger = new Logger();
class LogOutputEvent extends debugSession_1.OutputEvent {
    constructor(msg, level) {
        const category = level === LogLevel.Error ? 'stderr' :
            level === LogLevel.Warn ? 'console' :
                'stdout';
        super(msg, category);
    }
}
exports.LogOutputEvent = LogOutputEvent;
function trimLastNewline(str) {
    return str.replace(/(\n|\r\n)$/, '');
}
exports.trimLastNewline = trimLastNewline;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9nZ2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL2xvZ2dlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7OzREQUU0RDs7O0FBRTVELHFEQUFrRDtBQUNsRCxpREFBNkM7QUFFN0MsSUFBWSxRQU1YO0FBTkQsV0FBWSxRQUFRO0lBQ25CLDZDQUFXLENBQUE7SUFDWCxxQ0FBTyxDQUFBO0lBQ1AsdUNBQVEsQ0FBQTtJQUNSLHlDQUFTLENBQUE7SUFDVCx1Q0FBUSxDQUFBO0FBQ1QsQ0FBQyxFQU5XLFFBQVEsR0FBUixnQkFBUSxLQUFSLGdCQUFRLFFBTW5CO0FBNEJELE1BQWEsTUFBTTtJQUFuQjtRQUlTLGlCQUFZLEdBQWUsRUFBRSxDQUFDO0lBMkV2QyxDQUFDO0lBekVBLEdBQUcsQ0FBQyxHQUFXLEVBQUUsS0FBSyxHQUFHLFFBQVEsQ0FBQyxHQUFHO1FBQ3BDLEdBQUcsR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDO1FBQ2pCLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQ3pCLENBQUM7SUFFRCxPQUFPLENBQUMsR0FBVztRQUNsQixJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDakMsQ0FBQztJQUVELElBQUksQ0FBQyxHQUFXO1FBQ2YsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzlCLENBQUM7SUFFRCxLQUFLLENBQUMsR0FBVztRQUNoQixJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDL0IsQ0FBQztJQUVELE9BQU87UUFDTixJQUFJLElBQUksQ0FBQyxjQUFjLEVBQUU7WUFDeEIsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUMvQyxJQUFJLENBQUMsY0FBYyxHQUFHLElBQUksQ0FBQztZQUMzQixPQUFPLFFBQVEsQ0FBQztTQUNoQjthQUFNO1lBQ04sT0FBTyxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUM7U0FDekI7SUFDRixDQUFDO0lBRUQ7O09BRUc7SUFDSyxNQUFNLENBQUMsR0FBVyxFQUFFLEtBQUssR0FBRyxRQUFRLENBQUMsR0FBRztRQUMvQyw4QkFBOEI7UUFDOUIsR0FBRyxHQUFHLEdBQUcsR0FBRyxFQUFFLENBQUM7UUFDZixJQUFJLElBQUksQ0FBQyxZQUFZLEVBQUU7WUFDdEIsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztTQUN2QzthQUFNLElBQUksSUFBSSxDQUFDLGNBQWMsRUFBRTtZQUMvQixJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUM7U0FDcEM7SUFDRixDQUFDO0lBRUQ7OztPQUdHO0lBQ0gsS0FBSyxDQUFDLGtCQUE0QixFQUFFLFlBQTZCLEVBQUUsbUJBQTRCLElBQUk7UUFDbEcsTUFBTSxXQUFXLEdBQUcsT0FBTyxZQUFZLEtBQUssUUFBUSxDQUFDLENBQUM7WUFDckQsWUFBWSxDQUFDLENBQUM7WUFDZCxDQUFDLFlBQVksSUFBSSxJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQztRQUU3QyxJQUFJLElBQUksQ0FBQyxjQUFjLEVBQUU7WUFDeEIsTUFBTSxPQUFPLEdBQUc7Z0JBQ2Ysa0JBQWtCO2dCQUNsQixXQUFXO2dCQUNYLGdCQUFnQjthQUNoQixDQUFDO1lBQ0YsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRTtnQkFDNUMsc0ZBQXNGO2dCQUN0RixJQUFJLElBQUksQ0FBQyxZQUFZLEVBQUU7b0JBQ3RCLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUM7b0JBQy9CLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDO29CQUN6QixJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO2lCQUN4RDtZQUNGLENBQUMsQ0FBQyxDQUFDO1NBRUg7SUFDRixDQUFDO0lBRUQsSUFBSSxDQUFDLFdBQXlCLEVBQUUsV0FBb0IsRUFBRSxZQUFzQjtRQUMzRSxvQ0FBb0M7UUFDcEMsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUMsWUFBWSxJQUFJLEVBQUUsQ0FBQztRQUM1QyxJQUFJLENBQUMsY0FBYyxHQUFHLElBQUksK0JBQWMsQ0FBQyxXQUFXLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDcEUsSUFBSSxDQUFDLG9CQUFvQixHQUFHLFdBQVcsQ0FBQztJQUN6QyxDQUFDO0NBQ0Q7QUEvRUQsd0JBK0VDO0FBRVksUUFBQSxNQUFNLEdBQUcsSUFBSSxNQUFNLEVBQUUsQ0FBQztBQUVuQyxNQUFhLGNBQWUsU0FBUSwwQkFBVztJQUM5QyxZQUFZLEdBQVcsRUFBRSxLQUFlO1FBQ3ZDLE1BQU0sUUFBUSxHQUNiLEtBQUssS0FBSyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUNyQyxLQUFLLEtBQUssUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUM7Z0JBQ3JDLFFBQVEsQ0FBQztRQUNWLEtBQUssQ0FBQyxHQUFHLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFDdEIsQ0FBQztDQUNEO0FBUkQsd0NBUUM7QUFFRCxTQUFnQixlQUFlLENBQUMsR0FBVztJQUMxQyxPQUFPLEdBQUcsQ0FBQyxPQUFPLENBQUMsWUFBWSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0FBQ3RDLENBQUM7QUFGRCwwQ0FFQyIsInNvdXJjZXNDb250ZW50IjpbIi8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gKiBDb3B5cmlnaHQgKEMpIE1pY3Jvc29mdCBDb3Jwb3JhdGlvbi4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xuXG5pbXBvcnQgeyBJbnRlcm5hbExvZ2dlciB9IGZyb20gJy4vaW50ZXJuYWxMb2dnZXInO1xuaW1wb3J0IHsgT3V0cHV0RXZlbnQgfSBmcm9tICcuL2RlYnVnU2Vzc2lvbic7XG5cbmV4cG9ydCBlbnVtIExvZ0xldmVsIHtcblx0VmVyYm9zZSA9IDAsXG5cdExvZyA9IDEsXG5cdFdhcm4gPSAyLFxuXHRFcnJvciA9IDMsXG5cdFN0b3AgPSA0XG59XG5cbmV4cG9ydCB0eXBlIElMb2dDYWxsYmFjayA9IChvdXRwdXRFdmVudDogT3V0cHV0RXZlbnQpID0+IHZvaWQ7XG5cbmludGVyZmFjZSBJTG9nSXRlbSB7XG5cdG1zZzogc3RyaW5nO1xuXHRsZXZlbDogTG9nTGV2ZWw7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgSUxvZ2dlciB7XG5cdGxvZyhtc2c6IHN0cmluZywgbGV2ZWw/OiBMb2dMZXZlbCk6IHZvaWQ7XG5cdHZlcmJvc2UobXNnOiBzdHJpbmcpOiB2b2lkO1xuXHR3YXJuKG1zZzogc3RyaW5nKTogdm9pZDtcblx0ZXJyb3IobXNnOiBzdHJpbmcpOiB2b2lkO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIElJbnRlcm5hbExvZ2dlciB7XG5cdGRpc3Bvc2UoKTogUHJvbWlzZTx2b2lkPjtcblx0bG9nKG1zZzogc3RyaW5nLCBsZXZlbDogTG9nTGV2ZWwsIHByZXBlbmRUaW1lc3RhbXA/OiBib29sZWFuKSA6IHZvaWQ7XG5cdHNldHVwKG9wdGlvbnM6IElJbnRlcm5hbExvZ2dlck9wdGlvbnMpOiBQcm9taXNlPHZvaWQ+O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIElJbnRlcm5hbExvZ2dlck9wdGlvbnMge1xuXHRjb25zb2xlTWluTG9nTGV2ZWw6IExvZ0xldmVsO1xuXHRsb2dGaWxlUGF0aD86IHN0cmluZztcblx0cHJlcGVuZFRpbWVzdGFtcD86IGJvb2xlYW47XG59XG5cbmV4cG9ydCBjbGFzcyBMb2dnZXIge1xuXHRwcml2YXRlIF9sb2dGaWxlUGF0aEZyb21Jbml0OiBzdHJpbmc7XG5cblx0cHJpdmF0ZSBfY3VycmVudExvZ2dlcjogSUludGVybmFsTG9nZ2VyO1xuXHRwcml2YXRlIF9wZW5kaW5nTG9nUTogSUxvZ0l0ZW1bXSA9IFtdO1xuXG5cdGxvZyhtc2c6IHN0cmluZywgbGV2ZWwgPSBMb2dMZXZlbC5Mb2cpOiB2b2lkIHtcblx0XHRtc2cgPSBtc2cgKyAnXFxuJztcblx0XHR0aGlzLl93cml0ZShtc2csIGxldmVsKTtcblx0fVxuXG5cdHZlcmJvc2UobXNnOiBzdHJpbmcpOiB2b2lkIHtcblx0XHR0aGlzLmxvZyhtc2csIExvZ0xldmVsLlZlcmJvc2UpO1xuXHR9XG5cblx0d2Fybihtc2c6IHN0cmluZyk6IHZvaWQge1xuXHRcdHRoaXMubG9nKG1zZywgTG9nTGV2ZWwuV2Fybik7XG5cdH1cblxuXHRlcnJvcihtc2c6IHN0cmluZyk6IHZvaWQge1xuXHRcdHRoaXMubG9nKG1zZywgTG9nTGV2ZWwuRXJyb3IpO1xuXHR9XG5cblx0ZGlzcG9zZSgpOiBQcm9taXNlPHZvaWQ+IHtcblx0XHRpZiAodGhpcy5fY3VycmVudExvZ2dlcikge1xuXHRcdFx0Y29uc3QgZGlzcG9zZVAgPSB0aGlzLl9jdXJyZW50TG9nZ2VyLmRpc3Bvc2UoKTtcblx0XHRcdHRoaXMuX2N1cnJlbnRMb2dnZXIgPSBudWxsO1xuXHRcdFx0cmV0dXJuIGRpc3Bvc2VQO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG5cdFx0fVxuXHR9XG5cblx0LyoqXG5cdCAqIGBsb2dgIGFkZHMgYSBuZXdsaW5lLCBgd3JpdGVgIGRvZXNuJ3Rcblx0ICovXG5cdHByaXZhdGUgX3dyaXRlKG1zZzogc3RyaW5nLCBsZXZlbCA9IExvZ0xldmVsLkxvZyk6IHZvaWQge1xuXHRcdC8vIFtudWxsLCB1bmRlZmluZWRdID0+IHN0cmluZ1xuXHRcdG1zZyA9IG1zZyArICcnO1xuXHRcdGlmICh0aGlzLl9wZW5kaW5nTG9nUSkge1xuXHRcdFx0dGhpcy5fcGVuZGluZ0xvZ1EucHVzaCh7IG1zZywgbGV2ZWwgfSk7XG5cdFx0fSBlbHNlIGlmICh0aGlzLl9jdXJyZW50TG9nZ2VyKSB7XG5cdFx0XHR0aGlzLl9jdXJyZW50TG9nZ2VyLmxvZyhtc2csIGxldmVsKTtcblx0XHR9XG5cdH1cblxuXHQvKipcblx0ICogU2V0IHRoZSBsb2dnZXIncyBtaW5pbXVtIGxldmVsIHRvIGxvZyBpbiB0aGUgY29uc29sZSwgYW5kIHdoZXRoZXIgdG8gbG9nIHRvIHRoZSBmaWxlLiBMb2cgbWVzc2FnZXMgYXJlIHF1ZXVlZCBiZWZvcmUgdGhpcyBpc1xuXHQgKiBjYWxsZWQgdGhlIGZpcnN0IHRpbWUsIGJlY2F1c2UgbWluTG9nTGV2ZWwgZGVmYXVsdHMgdG8gV2Fybi5cblx0ICovXG5cdHNldHVwKGNvbnNvbGVNaW5Mb2dMZXZlbDogTG9nTGV2ZWwsIF9sb2dGaWxlUGF0aD86IHN0cmluZ3xib29sZWFuLCBwcmVwZW5kVGltZXN0YW1wOiBib29sZWFuID0gdHJ1ZSk6IHZvaWQge1xuXHRcdGNvbnN0IGxvZ0ZpbGVQYXRoID0gdHlwZW9mIF9sb2dGaWxlUGF0aCA9PT0gJ3N0cmluZycgP1xuXHRcdFx0X2xvZ0ZpbGVQYXRoIDpcblx0XHRcdChfbG9nRmlsZVBhdGggJiYgdGhpcy5fbG9nRmlsZVBhdGhGcm9tSW5pdCk7XG5cblx0XHRpZiAodGhpcy5fY3VycmVudExvZ2dlcikge1xuXHRcdFx0Y29uc3Qgb3B0aW9ucyA9IHtcblx0XHRcdFx0Y29uc29sZU1pbkxvZ0xldmVsLFxuXHRcdFx0XHRsb2dGaWxlUGF0aCxcblx0XHRcdFx0cHJlcGVuZFRpbWVzdGFtcFxuXHRcdFx0fTtcblx0XHRcdHRoaXMuX2N1cnJlbnRMb2dnZXIuc2V0dXAob3B0aW9ucykudGhlbigoKSA9PiB7XG5cdFx0XHRcdC8vIE5vdyB0aGF0IHdlIGhhdmUgYSBtaW5pbXVtIGxvZ0xldmVsLCB3ZSBjYW4gY2xlYXIgb3V0IHRoZSBxdWV1ZSBvZiBwZW5kaW5nIG1lc3NhZ2VzXG5cdFx0XHRcdGlmICh0aGlzLl9wZW5kaW5nTG9nUSkge1xuXHRcdFx0XHRcdGNvbnN0IGxvZ1EgPSB0aGlzLl9wZW5kaW5nTG9nUTtcblx0XHRcdFx0XHR0aGlzLl9wZW5kaW5nTG9nUSA9IG51bGw7XG5cdFx0XHRcdFx0bG9nUS5mb3JFYWNoKGl0ZW0gPT4gdGhpcy5fd3JpdGUoaXRlbS5tc2csIGl0ZW0ubGV2ZWwpKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cblx0XHR9XG5cdH1cblxuXHRpbml0KGxvZ0NhbGxiYWNrOiBJTG9nQ2FsbGJhY2ssIGxvZ0ZpbGVQYXRoPzogc3RyaW5nLCBsb2dUb0NvbnNvbGU/OiBib29sZWFuKTogdm9pZCB7XG5cdFx0Ly8gUmUtaW5pdCwgY3JlYXRlIG5ldyBnbG9iYWwgTG9nZ2VyXG5cdFx0dGhpcy5fcGVuZGluZ0xvZ1EgPSB0aGlzLl9wZW5kaW5nTG9nUSB8fCBbXTtcblx0XHR0aGlzLl9jdXJyZW50TG9nZ2VyID0gbmV3IEludGVybmFsTG9nZ2VyKGxvZ0NhbGxiYWNrLCBsb2dUb0NvbnNvbGUpO1xuXHRcdHRoaXMuX2xvZ0ZpbGVQYXRoRnJvbUluaXQgPSBsb2dGaWxlUGF0aDtcblx0fVxufVxuXG5leHBvcnQgY29uc3QgbG9nZ2VyID0gbmV3IExvZ2dlcigpO1xuXG5leHBvcnQgY2xhc3MgTG9nT3V0cHV0RXZlbnQgZXh0ZW5kcyBPdXRwdXRFdmVudCB7XG5cdGNvbnN0cnVjdG9yKG1zZzogc3RyaW5nLCBsZXZlbDogTG9nTGV2ZWwpIHtcblx0XHRjb25zdCBjYXRlZ29yeSA9XG5cdFx0XHRsZXZlbCA9PT0gTG9nTGV2ZWwuRXJyb3IgPyAnc3RkZXJyJyA6XG5cdFx0XHRsZXZlbCA9PT0gTG9nTGV2ZWwuV2FybiA/ICdjb25zb2xlJyA6XG5cdFx0XHQnc3Rkb3V0Jztcblx0XHRzdXBlcihtc2csIGNhdGVnb3J5KTtcblx0fVxufVxuXG5leHBvcnQgZnVuY3Rpb24gdHJpbUxhc3ROZXdsaW5lKHN0cjogc3RyaW5nKTogc3RyaW5nIHtcblx0cmV0dXJuIHN0ci5yZXBsYWNlKC8oXFxufFxcclxcbikkLywgJycpO1xufVxuXG5cbiJdfQ==

/***/ }),
/* 13 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InternalLogger = void 0;
const fs = __webpack_require__(14);
const path = __webpack_require__(15);
const mkdirp = __webpack_require__(16);
const logger_1 = __webpack_require__(12);
/**
 * Manages logging, whether to console.log, file, or VS Code console.
 * Encapsulates the state specific to each logging session
 */
class InternalLogger {
    constructor(logCallback, isServer) {
        /** Dispose and allow exit to continue normally */
        this.beforeExitCallback = () => this.dispose();
        this._logCallback = logCallback;
        this._logToConsole = isServer;
        this._minLogLevel = logger_1.LogLevel.Warn;
        this.disposeCallback = (signal, code) => {
            this.dispose();
            // Exit with 128 + value of the signal code.
            // https://nodejs.org/api/process.html#process_exit_codes
            code = code || 2; // SIGINT
            code += 128;
            process.exit(code);
        };
    }
    setup(options) {
        return __awaiter(this, void 0, void 0, function* () {
            this._minLogLevel = options.consoleMinLogLevel;
            this._prependTimestamp = options.prependTimestamp;
            // Open a log file in the specified location. Overwritten on each run.
            if (options.logFilePath) {
                if (!path.isAbsolute(options.logFilePath)) {
                    this.log(`logFilePath must be an absolute path: ${options.logFilePath}`, logger_1.LogLevel.Error);
                }
                else {
                    const handleError = err => this.sendLog(`Error creating log file at path: ${options.logFilePath}. Error: ${err.toString()}\n`, logger_1.LogLevel.Error);
                    try {
                        yield mkdirp(path.dirname(options.logFilePath));
                        this.log(`Verbose logs are written to:\n`, logger_1.LogLevel.Warn);
                        this.log(options.logFilePath + '\n', logger_1.LogLevel.Warn);
                        this._logFileStream = fs.createWriteStream(options.logFilePath);
                        this.logDateTime();
                        this.setupShutdownListeners();
                        this._logFileStream.on('error', err => {
                            handleError(err);
                        });
                    }
                    catch (err) {
                        handleError(err);
                    }
                }
            }
        });
    }
    logDateTime() {
        let d = new Date();
        let dateString = d.getUTCFullYear() + '-' + `${d.getUTCMonth() + 1}` + '-' + d.getUTCDate();
        const timeAndDateStamp = dateString + ', ' + getFormattedTimeString();
        this.log(timeAndDateStamp + '\n', logger_1.LogLevel.Verbose, false);
    }
    setupShutdownListeners() {
        process.addListener('beforeExit', this.beforeExitCallback);
        process.addListener('SIGTERM', this.disposeCallback);
        process.addListener('SIGINT', this.disposeCallback);
    }
    removeShutdownListeners() {
        process.removeListener('beforeExit', this.beforeExitCallback);
        process.removeListener('SIGTERM', this.disposeCallback);
        process.removeListener('SIGINT', this.disposeCallback);
    }
    dispose() {
        return new Promise(resolve => {
            this.removeShutdownListeners();
            if (this._logFileStream) {
                this._logFileStream.end(resolve);
                this._logFileStream = null;
            }
            else {
                resolve();
            }
        });
    }
    log(msg, level, prependTimestamp = true) {
        if (this._minLogLevel === logger_1.LogLevel.Stop) {
            return;
        }
        if (level >= this._minLogLevel) {
            this.sendLog(msg, level);
        }
        if (this._logToConsole) {
            const logFn = level === logger_1.LogLevel.Error ? console.error :
                level === logger_1.LogLevel.Warn ? console.warn :
                    null;
            if (logFn) {
                logFn(logger_1.trimLastNewline(msg));
            }
        }
        // If an error, prepend with '[Error]'
        if (level === logger_1.LogLevel.Error) {
            msg = `[${logger_1.LogLevel[level]}] ${msg}`;
        }
        if (this._prependTimestamp && prependTimestamp) {
            msg = '[' + getFormattedTimeString() + '] ' + msg;
        }
        if (this._logFileStream) {
            this._logFileStream.write(msg);
        }
    }
    sendLog(msg, level) {
        // Truncate long messages, they can hang VS Code
        if (msg.length > 1500) {
            const endsInNewline = !!msg.match(/(\n|\r\n)$/);
            msg = msg.substr(0, 1500) + '[...]';
            if (endsInNewline) {
                msg = msg + '\n';
            }
        }
        if (this._logCallback) {
            const event = new logger_1.LogOutputEvent(msg, level);
            this._logCallback(event);
        }
    }
}
exports.InternalLogger = InternalLogger;
function getFormattedTimeString() {
    let d = new Date();
    let hourString = _padZeroes(2, String(d.getUTCHours()));
    let minuteString = _padZeroes(2, String(d.getUTCMinutes()));
    let secondString = _padZeroes(2, String(d.getUTCSeconds()));
    let millisecondString = _padZeroes(3, String(d.getUTCMilliseconds()));
    return hourString + ':' + minuteString + ':' + secondString + '.' + millisecondString + ' UTC';
}
function _padZeroes(minDesiredLength, numberToPad) {
    if (numberToPad.length >= minDesiredLength) {
        return numberToPad;
    }
    else {
        return String('0'.repeat(minDesiredLength) + numberToPad).slice(-minDesiredLength);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW50ZXJuYWxMb2dnZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW50ZXJuYWxMb2dnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7Ozs7QUFFaEcseUJBQXlCO0FBQ3pCLDZCQUE2QjtBQUM3QixpQ0FBaUM7QUFFakMscUNBQTRIO0FBRTVIOzs7R0FHRztBQUNILE1BQWEsY0FBYztJQW1CMUIsWUFBWSxXQUF5QixFQUFFLFFBQWtCO1FBVHpELGtEQUFrRDtRQUMxQyx1QkFBa0IsR0FBRyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7UUFTakQsSUFBSSxDQUFDLFlBQVksR0FBRyxXQUFXLENBQUM7UUFDaEMsSUFBSSxDQUFDLGFBQWEsR0FBRyxRQUFRLENBQUM7UUFFOUIsSUFBSSxDQUFDLFlBQVksR0FBRyxpQkFBUSxDQUFDLElBQUksQ0FBQztRQUVsQyxJQUFJLENBQUMsZUFBZSxHQUFHLENBQUMsTUFBYyxFQUFFLElBQVksRUFBRSxFQUFFO1lBQ3ZELElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUVmLDRDQUE0QztZQUM1Qyx5REFBeUQ7WUFDekQsSUFBSSxHQUFHLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxTQUFTO1lBQzNCLElBQUksSUFBSSxHQUFHLENBQUM7WUFFWixPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3BCLENBQUMsQ0FBQztJQUNILENBQUM7SUFFWSxLQUFLLENBQUMsT0FBK0I7O1lBQ2pELElBQUksQ0FBQyxZQUFZLEdBQUcsT0FBTyxDQUFDLGtCQUFrQixDQUFDO1lBQy9DLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxPQUFPLENBQUMsZ0JBQWdCLENBQUM7WUFFbEQsc0VBQXNFO1lBQ3RFLElBQUksT0FBTyxDQUFDLFdBQVcsRUFBRTtnQkFDeEIsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxD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LEdBQUcsR0FBRyxHQUFHLFlBQVksR0FBRyxHQUFHLEdBQUcsaUJBQWlCLEdBQUcsTUFBTSxDQUFDO0FBQ2hHLENBQUM7QUFFRCxTQUFTLFVBQVUsQ0FBQyxnQkFBd0IsRUFBRSxXQUFtQjtJQUNoRSxJQUFJLFdBQVcsQ0FBQyxNQUFNLElBQUksZ0JBQWdCLEVBQUU7UUFDM0MsT0FBTyxXQUFXLENBQUM7S0FDbkI7U0FBTTtRQUNOLE9BQU8sTUFBTSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxXQUFXLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0tBQ25GO0FBQ0YsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gKiAgQ29weXJpZ2h0IChjKSBNaWNyb3NvZnQgQ29ycG9yYXRpb24uIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKiAgTGljZW5zZWQgdW5kZXIgdGhlIE1JVCBMaWNlbnNlLiBTZWUgTGljZW5zZS50eHQgaW4gdGhlIHByb2plY3Qgcm9vdCBmb3IgbGljZW5zZSBpbmZvcm1hdGlvbi5cbiAqLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xuXG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgbWtkaXJwIGZyb20gJ21rZGlycCc7XG5cbmltcG9ydCB7IExvZ0xldmVsLCBJTG9nQ2FsbGJhY2ssIHRyaW1MYXN0TmV3bGluZSwgTG9nT3V0cHV0RXZlbnQsIElJbnRlcm5hbExvZ2dlck9wdGlvbnMsIElJbnRlcm5hbExvZ2dlciB9IGZyb20gJy4vbG9nZ2VyJztcblxuLyoqXG4gKiBNYW5hZ2VzIGxvZ2dpbmcsIHdoZXRoZXIgdG8gY29uc29sZS5sb2csIGZpbGUsIG9yIFZTIENvZGUgY29uc29sZS5cbiAqIEVuY2Fwc3VsYXRlcyB0aGUgc3RhdGUgc3BlY2lmaWMgdG8gZWFjaCBsb2dnaW5nIHNlc3Npb25cbiAqL1xuZXhwb3J0IGNsYXNzIEludGVybmFsTG9nZ2VyIGltcGxlbWVudHMgSUludGVybmFsTG9nZ2VyIHtcblx0cHJpdmF0ZSBfbWluTG9nTGV2ZWw6IExvZ0xldmVsO1xuXHRwcml2YXRlIF9sb2dUb0NvbnNvbGU6IGJvb2xlYW47XG5cblx0LyoqIExvZyBpbmZvIHRoYXQgbWVldHMgbWluTG9nTGV2ZWwgaXMgc2VudCB0byB0aGlzIGNhbGxiYWNrLiAqL1xuXHRwcml2YXRlIF9sb2dDYWxsYmFjazogSUxvZ0NhbGxiYWNrO1xuXG5cdC8qKiBXcml0ZSBzdGVhbSBmb3IgbG9nIGZpbGUgKi9cblx0cHJpdmF0ZSBfbG9nRmlsZVN0cmVhbTogZnMuV3JpdGVTdHJlYW07XG5cblx0LyoqIERpc3Bvc2UgYW5kIGFsbG93IGV4aXQgdG8gY29udGludWUgbm9ybWFsbHkgKi9cblx0cHJpdmF0ZSBiZWZvcmVFeGl0Q2FsbGJhY2sgPSAoKSA9PiB0aGlzLmRpc3Bvc2UoKTtcblxuXHQvKiogRGlzcG9zZSBhbmQgZXhpdCAqL1xuXHRwcml2YXRlIGRpc3Bvc2VDYWxsYmFjaztcblxuXHQvKiogV2hldGhlciB0byBhZGQgYSB0aW1lc3RhbXAgdG8gbWVzc2FnZXMgaW4gdGhlIGxvZ2ZpbGUgKi9cblx0cHJpdmF0ZSBfcHJlcGVuZFRpbWVzdGFtcDogYm9vbGVhbjtcblxuXHRjb25zdHJ1Y3Rvcihsb2dDYWxsYmFjazogSUxvZ0NhbGxiYWNrLCBpc1NlcnZlcj86IGJvb2xlYW4pIHtcblx0XHR0aGlzLl9sb2dDYWxsYmFjayA9IGxvZ0NhbGxiYWNrO1xuXHRcdHRoaXMuX2xvZ1RvQ29uc29sZSA9IGlzU2VydmVyO1xuXG5cdFx0dGhpcy5fbWluTG9nTGV2ZWwgPSBMb2dMZXZlbC5XYXJuO1xuXG5cdFx0dGhpcy5kaXNwb3NlQ2FsbGJhY2sgPSAoc2lnbmFsOiBzdHJpbmcsIGNvZGU6IG51bWJlcikgPT4ge1xuXHRcdFx0dGhpcy5kaXNwb3NlKCk7XG5cblx0XHRcdC8vIEV4aXQgd2l0aCAxMjggKyB2YWx1ZSBvZiB0aGUgc2lnbmFsIGNvZGUuXG5cdFx0XHQvLyBodHRwczovL25vZGVqcy5vcmcvYXBpL3Byb2Nlc3MuaHRtbCNwcm9jZXNzX2V4aXRfY29kZXNcblx0XHRcdGNvZGUgPSBjb2RlIHx8IDI7IC8vIFNJR0lOVFxuXHRcdFx0Y29kZSArPSAxMjg7XG5cblx0XHRcdHByb2Nlc3MuZXhpdChjb2RlKTtcblx0XHR9O1xuXHR9XG5cblx0cHVibGljIGFzeW5jIHNldHVwKG9wdGlvbnM6IElJbnRlcm5hbExvZ2dlck9wdGlvbnMpOiBQcm9taXNlPHZvaWQ+IHtcblx0XHR0aGlzLl9taW5Mb2dMZXZlbCA9IG9wdGlvbnMuY29uc29sZU1pbkxvZ0xldmVsO1xuXHRcdHRoaXMuX3ByZXBlbmRUaW1lc3RhbXAgPSBvcHRpb25zLnByZXBlbmRUaW1lc3RhbXA7XG5cblx0XHQvLyBPcGVuIGEgbG9nIGZpbGUgaW4gdGhlIHNwZWNpZmllZCBsb2NhdGlvbi4gT3ZlcndyaXR0ZW4gb24gZWFjaCBydW4uXG5cdFx0aWYgKG9wdGlvbnMubG9nRmlsZVBhdGgpIHtcblx0XHRcdGlmICghcGF0aC5pc0Fic29sdXRlKG9wdGlvbnMubG9nRmlsZVBhdGgpKSB7XG5cdFx0XHRcdHRoaXMubG9nKGBsb2dGaWxlUGF0aCBtdXN0IGJlIGFuIGFic29sdXRlIHBhdGg6ICR7b3B0aW9ucy5sb2dGaWxlUGF0aH1gLCBMb2dMZXZlbC5FcnJvcik7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRjb25zdCBoYW5kbGVFcnJvciA9IGVyciA9PiB0aGlzLnNlbmRMb2coYEVycm9yIGNyZWF0aW5nIGxvZyBmaWxlIGF0IHBhdGg6ICR7b3B0aW9ucy5sb2dGaWxlUGF0aH0uIEVycm9yOiAke2Vyci50b1N0cmluZygpfVxcbmAsIExvZ0xldmVsLkVycm9yKTtcblxuXHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdGF3YWl0IG1rZGlycChwYXRoLmRpcm5hbWUob3B0aW9ucy5sb2dGaWxlUGF0aCkpO1xuXHRcdFx0XHRcdHRoaXMubG9nKGBWZXJib3NlIGxvZ3MgYXJlIHdyaXR0ZW4gdG86XFxuYCwgTG9nTGV2ZWwuV2Fybik7XG5cdFx0XHRcdFx0dGhpcy5sb2cob3B0aW9ucy5sb2dGaWxlUGF0aCArICdcXG4nLCBMb2dMZXZlbC5XYXJuKTtcblxuXHRcdFx0XHRcdHRoaXMuX2xvZ0ZpbGVTdHJlYW0gPSBmcy5jcmVhdGVXcml0ZVN0cmVhbShvcHRpb25zLmxvZ0ZpbGVQYXRoKTtcblx0XHRcdFx0XHR0aGlzLmxvZ0RhdGVUaW1lKCk7XG5cdFx0XHRcdFx0dGhpcy5zZXR1cFNodXRkb3duTGlzdGVuZXJzKCk7XG5cdFx0XHRcdFx0dGhpcy5fbG9nRmlsZVN0cmVhbS5vbignZXJyb3InLCBlcnIgPT4ge1xuXHRcdFx0XHRcdFx0aGFuZGxlRXJyb3IoZXJyKTtcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fSBjYXRjaCAoZXJyKSB7XG5cdFx0XHRcdFx0aGFuZGxlRXJyb3IoZXJyKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdHByaXZhdGUgbG9nRGF0ZVRpbWUoKTogdm9pZCB7XG5cdFx0bGV0IGQgPSBuZXcgRGF0ZSgpO1xuXHRcdGxldCBkYXRlU3RyaW5nID0gZC5nZXRVVENGdWxsWWVhcigpICsgJy0nICsgYCR7ZC5nZXRVVENNb250aCgpICsgMX1gICsgJy0nICsgZC5nZXRVVENEYXRlKCk7XG5cdFx0Y29uc3QgdGltZUFuZERhdGVTdGFtcCA9IGRhdGVTdHJpbmcgKyAnLCAnICsgZ2V0Rm9ybWF0dGVkVGltZVN0cmluZygpO1xuXHRcdHRoaXMubG9nKHRpbWVBbmREYXRlU3RhbXAgKyAnXFxuJywgTG9nTGV2ZWwuVmVyYm9zZSwgZmFsc2UpO1xuXHR9XG5cblx0cHJpdmF0ZSBzZXR1cFNodXRkb3duTGlzdGVuZXJzKCk6IHZvaWQge1xuXHRcdHByb2Nlc3MuYWRkTGlzdGVuZXIoJ2JlZm9yZUV4aXQnLCB0aGlzLmJlZm9yZUV4aXRDYWxsYmFjayk7XG5cdFx0cHJvY2Vzcy5hZGRMaXN0ZW5lcignU0lHVEVSTScsIHRoaXMuZGlzcG9zZUNhbGxiYWNrKTtcblx0XHRwcm9jZXNzLmFkZExpc3RlbmVyKCdTSUdJTlQnLCB0aGlzLmRpc3Bvc2VDYWxsYmFjayk7XG5cdH1cblxuXHRwcml2YXRlIHJlbW92ZVNodXRkb3duTGlzdGVuZXJzKCk6IHZvaWQge1xuXHRcdHByb2Nlc3MucmVtb3ZlTGlzdGVuZXIoJ2JlZm9yZUV4aXQnLCB0aGlzLmJlZm9yZUV4aXRDYWxsYmFjayk7XG5cdFx0cHJvY2Vzcy5yZW1vdmVMaXN0ZW5lcignU0lHVEVSTScsIHRoaXMuZGlzcG9zZUNhbGxiYWNrKTtcblx0XHRwcm9jZXNzLnJlbW92ZUxpc3RlbmVyKCdTSUdJTlQnLCB0aGlzLmRpc3Bvc2VDYWxsYmFjayk7XG5cdH1cblxuXHRwdWJsaWMgZGlzcG9zZSgpOiBQcm9taXNlPHZvaWQ+IHtcblx0XHRyZXR1cm4gbmV3IFByb21pc2UocmVzb2x2ZSA9PiB7XG5cdFx0XHR0aGlzLnJlbW92ZVNodXRkb3duTGlzdGVuZXJzKCk7XG5cdFx0XHRpZiAodGhpcy5fbG9nRmlsZVN0cmVhbSkge1xuXHRcdFx0XHR0aGlzLl9sb2dGaWxlU3RyZWFtLmVuZChyZXNvbHZlKTtcblx0XHRcdFx0dGhpcy5fbG9nRmlsZVN0cmVhbSA9IG51bGw7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRyZXNvbHZlKCk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH1cblxuXHRwdWJsaWMgbG9nKG1zZzogc3RyaW5nLCBsZXZlbDogTG9nTGV2ZWwsIHByZXBlbmRUaW1lc3RhbXAgPSB0cnVlKTogdm9pZCB7XG5cdFx0aWYgKHRoaXMuX21pbkxvZ0xldmVsID09PSBMb2dMZXZlbC5TdG9wKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0aWYgKGxldmVsID49IHRoaXMuX21pbkxvZ0xldmVsKSB7XG5cdFx0XHR0aGlzLnNlbmRMb2cobXNnLCBsZXZlbCk7XG5cdFx0fVxuXG5cdFx0aWYgKHRoaXMuX2xvZ1RvQ29uc29sZSkge1xuXHRcdFx0Y29uc3QgbG9nRm4gPVxuXHRcdFx0XHRsZXZlbCA9PT0gTG9nTGV2ZWwuRXJyb3IgPyBjb25zb2xlLmVycm9yIDpcblx0XHRcdFx0bGV2ZWwgPT09IExvZ0xldmVsLldhcm4gPyBjb25zb2xlLndhcm4gOlxuXHRcdFx0XHRudWxsO1xuXG5cdFx0XHRpZiAobG9nRm4pIHtcblx0XHRcdFx0bG9nRm4odHJpbUxhc3ROZXdsaW5lKG1zZykpO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vIElmIGFuIGVycm9yLCBwcmVwZW5kIHdpdGggJ1tFcnJvcl0nXG5cdFx0aWYgKGxldmVsID09PSBMb2dMZXZlbC5FcnJvcikge1xuXHRcdFx0bXNnID0gYFske0xvZ0xldmVsW2xldmVsXX1dICR7bXNnfWA7XG5cdFx0fVxuXG5cdFx0aWYgKHRoaXMuX3ByZXBlbmRUaW1lc3RhbXAgJiYgcHJlcGVuZFRpbWVzdGFtcCkge1xuXHRcdFx0bXNnID0gJ1snICsgZ2V0Rm9ybWF0dGVkVGltZVN0cmluZygpICsgJ10gJyArIG1zZztcblx0XHR9XG5cblx0XHRpZiAodGhpcy5fbG9nRmlsZVN0cmVhbSkge1xuXHRcdFx0dGhpcy5fbG9nRmlsZVN0cmVhbS53cml0ZShtc2cpO1xuXHRcdH1cblx0fVxuXG5cdHByaXZhdGUgc2VuZExvZyhtc2c6IHN0cmluZywgbGV2ZWw6IExvZ0xldmVsKTogdm9pZCB7XG5cdFx0Ly8gVHJ1bmNhdGUgbG9uZyBtZXNzYWdlcywgdGhleSBjYW4gaGFuZyBWUyBDb2RlXG5cdFx0aWYgKG1zZy5sZW5ndGggPiAxNTAwKSB7XG5cdFx0XHRjb25zdCBlbmRzSW5OZXdsaW5lID0gISFtc2cubWF0Y2goLyhcXG58XFxyXFxuKSQvKTtcblx0XHRcdG1zZyA9IG1zZy5zdWJzdHIoMCwgMTUwMCkgKyAnWy4uLl0nO1xuXHRcdFx0aWYgKGVuZHNJbk5ld2xpbmUpIHtcblx0XHRcdFx0bXNnID0gbXNnICsgJ1xcbic7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0aWYgKHRoaXMuX2xvZ0NhbGxiYWNrKSB7XG5cdFx0XHRjb25zdCBldmVudCA9IG5ldyBMb2dPdXRwdXRFdmVudChtc2csIGxldmVsKTtcblx0XHRcdHRoaXMuX2xvZ0NhbGxiYWNrKGV2ZW50KTtcblx0XHR9XG5cdH1cbn1cblxuZnVuY3Rpb24gZ2V0Rm9ybWF0dGVkVGltZVN0cmluZygpOiBzdHJpbmcge1xuXHRsZXQgZCA9IG5ldyBEYXRlKCk7XG5cdGxldCBob3VyU3RyaW5nID0gX3BhZFplcm9lcygyLCBTdHJpbmcoZC5nZXRVVENIb3VycygpKSk7XG5cdGxldCBtaW51dGVTdHJpbmcgPSBfcGFkWmVyb2VzKDIsIFN0cmluZyhkLmdldFVUQ01pbnV0ZXMoKSkpO1xuXHRsZXQgc2Vjb25kU3RyaW5nID0gX3BhZFplcm9lcygyLCBTdHJpbmcoZC5nZXRVVENTZWNvbmRzKCkpKTtcblx0bGV0IG1pbGxpc2Vjb25kU3RyaW5nID0gX3BhZFplcm9lcygzLCBTdHJpbmcoZC5nZXRVVENNaWxsaXNlY29uZHMoKSkpO1xuXHRyZXR1cm4gaG91clN0cmluZyArICc6JyArIG1pbnV0ZVN0cmluZyArICc6JyArIHNlY29uZFN0cmluZyArICcuJyArIG1pbGxpc2Vjb25kU3RyaW5nICsgJyBVVEMnO1xufVxuXG5mdW5jdGlvbiBfcGFkWmVyb2VzKG1pbkRlc2lyZWRMZW5ndGg6IG51bWJlciwgbnVtYmVyVG9QYWQ6IHN0cmluZyk6IHN0cmluZyB7XG5cdGlmIChudW1iZXJUb1BhZC5sZW5ndGggPj0gbWluRGVzaXJlZExlbmd0aCkge1xuXHRcdHJldHVybiBudW1iZXJUb1BhZDtcblx0fSBlbHNlIHtcblx0XHRyZXR1cm4gU3RyaW5nKCcwJy5yZXBlYXQobWluRGVzaXJlZExlbmd0aCkgKyBudW1iZXJUb1BhZCkuc2xpY2UoLW1pbkRlc2lyZWRMZW5ndGgpO1xuXHR9XG59XG4iXX0=

/***/ }),
/* 14 */
/***/ (function(module, exports) {

module.exports = require("fs");

/***/ }),
/* 15 */
/***/ (function(module, exports) {

module.exports = require("path");

/***/ }),
/* 16 */
/***/ (function(module, exports, __webpack_require__) {

const optsArg = __webpack_require__(17)
const pathArg = __webpack_require__(19)

const {mkdirpNative, mkdirpNativeSync} = __webpack_require__(20)
const {mkdirpManual, mkdirpManualSync} = __webpack_require__(22)
const {useNative, useNativeSync} = __webpack_require__(23)


const mkdirp = (path, opts) => {
  path = pathArg(path)
  opts = optsArg(opts)
  return useNative(opts)
    ? mkdirpNative(path, opts)
    : mkdirpManual(path, opts)
}

const mkdirpSync = (path, opts) => {
  path = pathArg(path)
  opts = optsArg(opts)
  return useNativeSync(opts)
    ? mkdirpNativeSync(path, opts)
    : mkdirpManualSync(path, opts)
}

mkdirp.sync = mkdirpSync
mkdirp.native = (path, opts) => mkdirpNative(pathArg(path), optsArg(opts))
mkdirp.manual = (path, opts) => mkdirpManual(pathArg(path), optsArg(opts))
mkdirp.nativeSync = (path, opts) => mkdirpNativeSync(pathArg(path), optsArg(opts))
mkdirp.manualSync = (path, opts) => mkdirpManualSync(pathArg(path), optsArg(opts))

module.exports = mkdirp


/***/ }),
/* 17 */
/***/ (function(module, exports, __webpack_require__) {

const { promisify } = __webpack_require__(18)
const fs = __webpack_require__(14)
const optsArg = opts => {
  if (!opts)
    opts = { mode: 0o777, fs }
  else if (typeof opts === 'object')
    opts = { mode: 0o777, fs, ...opts }
  else if (typeof opts === 'number')
    opts = { mode: opts, fs }
  else if (typeof opts === 'string')
    opts = { mode: parseInt(opts, 8), fs }
  else
    throw new TypeError('invalid options argument')

  opts.mkdir = opts.mkdir || opts.fs.mkdir || fs.mkdir
  opts.mkdirAsync = promisify(opts.mkdir)
  opts.stat = opts.stat || opts.fs.stat || fs.stat
  opts.statAsync = promisify(opts.stat)
  opts.statSync = opts.statSync || opts.fs.statSync || fs.statSync
  opts.mkdirSync = opts.mkdirSync || opts.fs.mkdirSync || fs.mkdirSync
  return opts
}
module.exports = optsArg


/***/ }),
/* 18 */
/***/ (function(module, exports) {

module.exports = require("util");

/***/ }),
/* 19 */
/***/ (function(module, exports, __webpack_require__) {

const platform = process.env.__TESTING_MKDIRP_PLATFORM__ || process.platform
const { resolve, parse } = __webpack_require__(15)
const pathArg = path => {
  if (/\0/.test(path)) {
    // simulate same failure that node raises
    throw Object.assign(
      new TypeError('path must be a string without null bytes'),
      {
        path,
        code: 'ERR_INVALID_ARG_VALUE',
      }
    )
  }

  path = resolve(path)
  if (platform === 'win32') {
    const badWinChars = /[*|"<>?:]/
    const {root} = parse(path)
    if (badWinChars.test(path.substr(root.length))) {
      throw Object.assign(new Error('Illegal characters in path.'), {
        path,
        code: 'EINVAL',
      })
    }
  }

  return path
}
module.exports = pathArg


/***/ }),
/* 20 */
/***/ (function(module, exports, __webpack_require__) {

const {dirname} = __webpack_require__(15)
const {findMade, findMadeSync} = __webpack_require__(21)
const {mkdirpManual, mkdirpManualSync} = __webpack_require__(22)

const mkdirpNative = (path, opts) => {
  opts.recursive = true
  const parent = dirname(path)
  if (parent === path)
    return opts.mkdirAsync(path, opts)

  return findMade(opts, path).then(made =>
    opts.mkdirAsync(path, opts).then(() => made)
    .catch(er => {
      if (er.code === 'ENOENT')
        return mkdirpManual(path, opts)
      else
        throw er
    }))
}

const mkdirpNativeSync = (path, opts) => {
  opts.recursive = true
  const parent = dirname(path)
  if (parent === path)
    return opts.mkdirSync(path, opts)

  const made = findMadeSync(opts, path)
  try {
    opts.mkdirSync(path, opts)
    return made
  } catch (er) {
    if (er.code === 'ENOENT')
      return mkdirpManualSync(path, opts)
    else
      throw er
  }
}

module.exports = {mkdirpNative, mkdirpNativeSync}


/***/ }),
/* 21 */
/***/ (function(module, exports, __webpack_require__) {

const {dirname} = __webpack_require__(15)

const findMade = (opts, parent, path = undefined) => {
  // we never want the 'made' return value to be a root directory
  if (path === parent)
    return Promise.resolve()

  return opts.statAsync(parent).then(
    st => st.isDirectory() ? path : undefined, // will fail later
    er => er.code === 'ENOENT'
      ? findMade(opts, dirname(parent), parent)
      : undefined
  )
}

const findMadeSync = (opts, parent, path = undefined) => {
  if (path === parent)
    return undefined

  try {
    return opts.statSync(parent).isDirectory() ? path : undefined
  } catch (er) {
    return er.code === 'ENOENT'
      ? findMadeSync(opts, dirname(parent), parent)
      : undefined
  }
}

module.exports = {findMade, findMadeSync}


/***/ }),
/* 22 */
/***/ (function(module, exports, __webpack_require__) {

const {dirname} = __webpack_require__(15)

const mkdirpManual = (path, opts, made) => {
  opts.recursive = false
  const parent = dirname(path)
  if (parent === path) {
    return opts.mkdirAsync(path, opts).catch(er => {
      // swallowed by recursive implementation on posix systems
      // any other error is a failure
      if (er.code !== 'EISDIR')
        throw er
    })
  }

  return opts.mkdirAsync(path, opts).then(() => made || path, er => {
    if (er.code === 'ENOENT')
      return mkdirpManual(parent, opts)
        .then(made => mkdirpManual(path, opts, made))
    if (er.code !== 'EEXIST' && er.code !== 'EROFS')
      throw er
    return opts.statAsync(path).then(st => {
      if (st.isDirectory())
        return made
      else
        throw er
    }, () => { throw er })
  })
}

const mkdirpManualSync = (path, opts, made) => {
  const parent = dirname(path)
  opts.recursive = false

  if (parent === path) {
    try {
      return opts.mkdirSync(path, opts)
    } catch (er) {
      // swallowed by recursive implementation on posix systems
      // any other error is a failure
      if (er.code !== 'EISDIR')
        throw er
      else
        return
    }
  }

  try {
    opts.mkdirSync(path, opts)
    return made || path
  } catch (er) {
    if (er.code === 'ENOENT')
      return mkdirpManualSync(path, opts, mkdirpManualSync(parent, opts, made))
    if (er.code !== 'EEXIST' && er.code !== 'EROFS')
      throw er
    try {
      if (!opts.statSync(path).isDirectory())
        throw er
    } catch (_) {
      throw er
    }
  }
}

module.exports = {mkdirpManual, mkdirpManualSync}


/***/ }),
/* 23 */
/***/ (function(module, exports, __webpack_require__) {

const fs = __webpack_require__(14)

const version = process.env.__TESTING_MKDIRP_NODE_VERSION__ || process.version
const versArr = version.replace(/^v/, '').split('.')
const hasNative = +versArr[0] > 10 || +versArr[0] === 10 && +versArr[1] >= 12

const useNative = !hasNative ? () => false : opts => opts.mkdir === fs.mkdir
const useNativeSync = !hasNative ? () => false : opts => opts.mkdirSync === fs.mkdirSync

module.exports = {useNative, useNativeSync}


/***/ }),
/* 24 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.Handles = void 0;
class Handles {
    constructor(startHandle) {
        this.START_HANDLE = 1000;
        this._handleMap = new Map();
        this._nextHandle = typeof startHandle === 'number' ? startHandle : this.START_HANDLE;
    }
    reset() {
        this._nextHandle = this.START_HANDLE;
        this._handleMap = new Map();
    }
    create(value) {
        var handle = this._nextHandle++;
        this._handleMap.set(handle, value);
        return handle;
    }
    get(handle, dflt) {
        return this._handleMap.get(handle) || dflt;
    }
}
exports.Handles = Handles;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGFuZGxlcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9oYW5kbGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7O2dHQUdnRzs7O0FBRWhHLE1BQWEsT0FBTztJQU9uQixZQUFtQixXQUFvQjtRQUwvQixpQkFBWSxHQUFHLElBQUksQ0FBQztRQUdwQixlQUFVLEdBQUcsSUFBSSxHQUFHLEVBQWEsQ0FBQztRQUd6QyxJQUFJLENBQUMsV0FBVyxHQUFHLE9BQU8sV0FBVyxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDO0lBQ3RGLENBQUM7SUFFTSxLQUFLO1FBQ1gsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDO1FBQ3JDLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxHQUFHLEVBQWEsQ0FBQztJQUN4QyxDQUFDO0lBRU0sTUFBTSxDQUFDLEtBQVE7UUFDckIsSUFBSSxNQUFNLEdBQUcsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQ2hDLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNuQyxPQUFPLE1BQU0sQ0FBQztJQUNmLENBQUM7SUFFTSxHQUFHLENBQUMsTUFBYyxFQUFFLElBQVE7UUFDbEMsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxJQUFJLENBQUM7SUFDNUMsQ0FBQztDQUNEO0FBekJELDBCQXlCQyIsInNvdXJjZXNDb250ZW50IjpbIi8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gKiAgQ29weXJpZ2h0IChjKSBNaWNyb3NvZnQgQ29ycG9yYXRpb24uIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKiAgTGljZW5zZWQgdW5kZXIgdGhlIE1JVCBMaWNlbnNlLiBTZWUgTGljZW5zZS50eHQgaW4gdGhlIHByb2plY3Qgcm9vdCBmb3IgbGljZW5zZSBpbmZvcm1hdGlvbi5cbiAqLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xuXG5leHBvcnQgY2xhc3MgSGFuZGxlczxUPiB7XG5cblx0cHJpdmF0ZSBTVEFSVF9IQU5ETEUgPSAxMDAwO1xuXG5cdHByaXZhdGUgX25leHRIYW5kbGUgOiBudW1iZXI7XG5cdHByaXZhdGUgX2hhbmRsZU1hcCA9IG5ldyBNYXA8bnVtYmVyLCBUPigpO1xuXG5cdHB1YmxpYyBjb25zdHJ1Y3RvcihzdGFydEhhbmRsZT86IG51bWJlcikge1xuXHRcdHRoaXMuX25leHRIYW5kbGUgPSB0eXBlb2Ygc3RhcnRIYW5kbGUgPT09ICdudW1iZXInID8gc3RhcnRIYW5kbGUgOiB0aGlzLlNUQVJUX0hBTkRMRTtcblx0fVxuXG5cdHB1YmxpYyByZXNldCgpOiB2b2lkIHtcblx0XHR0aGlzLl9uZXh0SGFuZGxlID0gdGhpcy5TVEFSVF9IQU5ETEU7XG5cdFx0dGhpcy5faGFuZGxlTWFwID0gbmV3IE1hcDxudW1iZXIsIFQ+KCk7XG5cdH1cblxuXHRwdWJsaWMgY3JlYXRlKHZhbHVlOiBUKTogbnVtYmVyIHtcblx0XHR2YXIgaGFuZGxlID0gdGhpcy5fbmV4dEhhbmRsZSsrO1xuXHRcdHRoaXMuX2hhbmRsZU1hcC5zZXQoaGFuZGxlLCB2YWx1ZSk7XG5cdFx0cmV0dXJuIGhhbmRsZTtcblx0fVxuXG5cdHB1YmxpYyBnZXQoaGFuZGxlOiBudW1iZXIsIGRmbHQ/OiBUKTogVCB7XG5cdFx0cmV0dXJuIHRoaXMuX2hhbmRsZU1hcC5nZXQoaGFuZGxlKSB8fCBkZmx0O1xuXHR9XG59XG4iXX0=

/***/ }),
/* 25 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.GDB = exports.SCOPE_LOCAL = exports.EVENT_SOLIB_LOADED = exports.EVENT_THREAD_NEW = exports.EVENT_ERROR_FATAL = exports.EVENT_ERROR = exports.EVENT_PAUSED = exports.EVENT_SIGNAL = exports.EVENT_EXITED_NORMALLY = exports.EVENT_FUNCTION_FINISHED = exports.EVENT_END_STEPPING_RANGE = exports.EVENT_BREAKPOINT_HIT = exports.EVENT_RUNNING = exports.EVENT_OUTPUT = void 0;
const MIParser_1 = __webpack_require__(26);
const events_1 = __webpack_require__(6);
const AsyncRecord_1 = __webpack_require__(27);
const ResultRecord_1 = __webpack_require__(30);
const StreamRecord_1 = __webpack_require__(29);
const vscode_debugadapter_1 = __webpack_require__(3);
const vscode = __webpack_require__(1);
const fs = __webpack_require__(14);
const path = __webpack_require__(15);
const child_process_1 = __webpack_require__(31);
const GDBDebugSession_1 = __webpack_require__(2);
// GDB stop reasons
exports.EVENT_OUTPUT = 'output';
exports.EVENT_RUNNING = 'running';
exports.EVENT_BREAKPOINT_HIT = 'breakpoint-hit';
exports.EVENT_END_STEPPING_RANGE = 'end-stepping-range';
exports.EVENT_FUNCTION_FINISHED = 'function-finished';
exports.EVENT_EXITED_NORMALLY = 'exited-normally';
exports.EVENT_SIGNAL = 'signal-received';
exports.EVENT_PAUSED = 'paused';
exports.EVENT_ERROR = 'error';
exports.EVENT_ERROR_FATAL = 'error-fatal';
exports.EVENT_THREAD_NEW = 'thread-created';
exports.EVENT_SOLIB_LOADED = 'library-loaded';
exports.SCOPE_LOCAL = 1000;
// Used as an abstraction for integrated/non-integrated terminals
class TerminalWindow {
}
class IntegratedTerminal extends TerminalWindow {
    constructor(cmd, terminal) {
        super();
        this.terminal = terminal;
        this.sendCommand('clear');
        this.sendCommand(cmd);
        this.terminal.show(true);
    }
    sendCommand(cmd) {
        this.terminal.sendText(cmd);
    }
    destroy() {
        // Nothing needs to be done for integrated terminal
    }
}
// Todo implement terminateRequest and close external terminal
class ExternalTerminal extends TerminalWindow {
    constructor(cmd) {
        super();
        this.terminal = (0, child_process_1.spawn)('x-terminal-emulator', ['-e', cmd]);
        this.terminal.on('error', () => {
            console.log('Failed to open external terminal');
        });
    }
    sendCommand(cmd) {
        this.terminal.stdin.write(cmd + '\n');
    }
    destroy() {
        // Close terminal if not done already
        this.terminal.kill();
    }
}
class GDB extends events_1.EventEmitter {
    constructor(outputChannel) {
        super();
        // Default path to MI debugger. If none is specified in the launch config
        // we will fallback to this path
        this.path = 'gdb';
        // Arguments to pass to GDB. These will be combined with any that need to
        // be threaded to the inferior process
        this.args = ['--interpreter=mi', '-q', '--tty=`tty`'];
        // Control whether or not to dump extension diagnostic information to a
        // dedicated output channel (useful for development)
        this.debug = GDBDebugSession_1.DebugLoggingLevel.OFF;
        // Filepaths to input and output pipes used for IPC with GDB process. These
        // will be randomly generated on each debug session
        this.inputFile = '';
        this.outputFile = '';
        // Inferior PID for attach requests
        this.PID = 0;
        // Should we emit a stopped event on a pause?
        this.handleSIGINT = true;
        // Should we only load certain libraries?
        this.sharedLibraries = [];
        // Should we use absolute file paths when setting breakpoints?
        this.useAbsoluteFilePaths = true;
        this.outputChannel = outputChannel;
        this.token = 0;
        this.threadID = 0;
        this.ob = '';
        this.handlers = [];
        this.parser = new MIParser_1.MIParser();
        // This is a bit of a hack -- since there is no elegant way of making a
        // FIFO pipe in nodeJS we need to resort to a shell to do so. We need to
        // do this in the constructor to give sufficient time for the FIFO pipe
        // creation prior to writing to it
        this.createIOPipes();
    }
    createIOPipes() {
        this.inputFile = this.generateTmpFile('In') + this.token;
        this.outputFile = this.generateTmpFile('Out') + this.token;
        const cmd = `mkfifo ${this.inputFile} ;`;
        const { exec } = __webpack_require__(31);
        exec(cmd);
    }
    log(text) {
        if (this.debug !== GDBDebugSession_1.DebugLoggingLevel.OFF) {
            this.outputChannel.appendLine(text);
        }
    }
    genRandomID(length) {
        let result = '';
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        const charactersLength = characters.length;
        for (let i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        return result;
    }
    generateTmpFile(desc) {
        return `/tmp/vGDB_${desc}${this.genRandomID(8)}`;
    }
    createLaunchCommand() {
        // This idea is borrowed from the Microsoft cpptools VSCode extension.
        // It really is the only conceivable way to support running in the
        // integrated terminal. We spin on the GDB process to prevent the shell
        // from accepting normal commands. We set a trap handler to correctly
        // communicate inferior completion back to the debug adapter so we can
        // issue the corresponding TerminatedEvent and take down GDB. We issue
        // the +m command to hide the background "done" message when GDB
        // finishes debugging the inferior
        // All of these hacks probably won't work on Windows
        fs.writeFile(this.outputFile, '', () => { });
        // We cannot simply send all commands to the terminal and assume the
        // user's default shell is bash. Instead we will wrap all cmds in a
        // string and explicitly invoke the bash shell
        return `trap '' 2 ; ${this.path} ${this.args.join(' ')} < ${this.inputFile} > ${this.outputFile} & clear ; pid=$!; set +m ; wait $pid ; trap 2 ; echo ;`;
    }
    setDebug(debug) {
        this.debug = debug;
    }
    isLaunch(arg) {
        return arg && typeof arg.program === 'string';
    }
    spawn(args, terminal) {
        return new Promise((resolve, reject) => {
            let envVarsSetupCmd;
            // Spawn the GDB process in the integrated terminal. In order to
            // correctly separate inferior output from GDB output and pipe
            // them to the correct handlers we use some hacks:
            // (1) We set the inferior-tty to be that of the integrated terminal
            //     This lets us pipe all stdout/stderr from the inferior there
            //     and separate it from any output created by GDB. It also lets
            //     us use the integrated terminal for the inferior's input
            // (2) We redirect all GDB stdout to a tmp file which the debug
            //     adapter will monitor for command results and other async
            //     notify events
            // (3) We redirect all stdin to GDB through another FIFO pipe which
            //     we will keep open throughout the entirety of the debug
            //     session (to prevent premature debugger exit).
            if (args.debugger) {
                this.path = args.debugger;
            }
            // (Advanced) if user has specified filenames only be used for
            // setting breakpoints, set the appropriate flag
            if (args.useAbsoluteFilePaths !== undefined) {
                this.useAbsoluteFilePaths = args.useAbsoluteFilePaths;
            }
            // If this is an attach request, the program arg will be a numeric
            // We need to thread this differently to GDB
            if (this.isLaunch(args)) {
                if (args.args) {
                    this.args.push('--args');
                    this.args.push(args.program);
                    this.args = this.args.concat(args.args);
                }
                else {
                    this.args.push(args.program);
                }
                if (args.envVars) {
                    envVarsSetupCmd = this.createEnvVarsCmd(args.envVars);
                }
            }
            else {
                this.PID = args.program;
            }
            const launchCmd = this.createLaunchCommand();
            this.log(launchCmd);
            if (envVarsSetupCmd && this.terminal) {
                this.terminal.sendCommand(envVarsSetupCmd);
            }
            // If the launch has requested an external terminal, spawn one. If so,
            // we will not clear the old terminal. We only clear the integrated
            // terminal if we will be reusing it
            if (args.externalConsole !== undefined && args.externalConsole) {
                this.terminal = new ExternalTerminal(`bash -c "${launchCmd}"`);
            }
            else {
                this.terminal = new IntegratedTerminal(`bash -c "${launchCmd}"`, terminal);
            }
            this.inputHandle = fs.createWriteStream(this.inputFile, { flags: 'a' });
            this.outputHandle = fs.createReadStream(this.outputFile);
            this.outputHandle.on('data', (data) => {
                this.stdoutHandler(data);
            });
            // Only consider GDB as ready once pipe is ready. Once ready send all setup
            // cmds to GDB and then resolve promise
            this.inputHandle.on('open', () => {
                const cmdsPending = [];
                if (this.isLaunch(args) && args.startupCmds) {
                    args.startupCmds.forEach(cmd => {
                        cmdsPending.push(this.sendCommand(cmd));
                    });
                }
                Promise.all(cmdsPending).then(brkpoints => {
                    resolve(true);
                });
            });
        });
    }
    // Send an MI command to GDB
    sendCommand(cmd) {
        return new Promise((resolve, reject) => {
            const token = ++this.token;
            cmd = token + cmd;
            this.log(cmd);
            this.inputHandle.write(cmd + '\n');
            this.handlers[token] = (record) => {
                this.log(record.prettyPrint());
                resolve(record);
            };
        });
    }
    deferLibraryLoading(libraries) {
        this.sharedLibraries = libraries;
        console.log(this.sharedLibraries);
        return this.sendCommand('-gdb-set auto-solib-add off');
    }
    sanitize(text, MI) {
        text = text
            .replace(/&"/g, '')
            .replace(/\\n/g, '')
            .replace(/\\r/g, '')
            .replace(/\\t/g, '\t')
            .replace(/\\v/g, '\v')
            .replace(/\\"/g, '"')
            .replace(/\\'/g, "'")
            .replace(/\\\\/g, '\\');
        // If we are sanitizing MI output there are additional things we need
        // to strip out
        if (MI) {
            text = text.replace(/^~"[0-9]*/g, '').replace(/"$/g, '');
        }
        return text;
    }
    createEnvVarsCmd(envVars) {
        const cmd = '';
        // TODO
        /*
        Object.keys(envVars).forEach((key: string) => {
          cmd = `export ${key} = ${envVars[key]}; ${cmd}`;
        });*/
        return cmd;
    }
    // Called on any stdout produced by GDB Process
    stdoutHandler(data) {
        let record;
        const str = data.toString('utf8');
        this.ob += str;
        // We may be receiving buffered output. In such case defer parsing until
        // full output has been transmitted as denoted by a trailing newline
        const nPos = this.ob.lastIndexOf('\n');
        if (nPos !== -1) {
            this.ob = this.ob.substr(0, nPos);
            // If multiple lines have buffered, handle each one
            const lines = this.ob.substr(0, nPos).split('\n');
            // Flush output buffer for next round of output
            this.ob = this.ob.substring(nPos + 1);
            lines.forEach(line => {
                try {
                    if ((record = this.parser.parse(line))) {
                        this.handleParsedResult(record);
                        // Minimize the amount of logging
                        if (record.constructor === StreamRecord_1.StreamRecord ||
                            this.debug === GDBDebugSession_1.DebugLoggingLevel.VERBOSE) {
                            this.emit(exports.EVENT_OUTPUT, this.sanitize(record.prettyPrint(), true));
                        }
                    }
                }
                catch (error) {
                    this.log(error.stack);
                    console.log(error.stack);
                    this.emit(exports.EVENT_ERROR_FATAL);
                }
            });
        }
    }
    handleParsedResult(record) {
        switch (record.constructor) {
            case AsyncRecord_1.AsyncRecord:
                // Notify GDB client of status change
                switch (record.getType()) {
                    case AsyncRecord_1.AsyncRecordType.EXEC:
                        switch (record.getClass()) {
                            case MIParser_1.STOPPED: {
                                this.threadID = parseInt(record.getResult('thread-id'));
                                const reason = record.getResult('reason');
                                // Play nice with attach requests
                                if (reason !== undefined) {
                                    switch (reason) {
                                        case exports.EVENT_BREAKPOINT_HIT:
                                            this.emit(reason, this.threadID);
                                            break;
                                        case exports.EVENT_END_STEPPING_RANGE:
                                            this.emit(reason, this.threadID);
                                            break;
                                        case exports.EVENT_FUNCTION_FINISHED:
                                            this.emit(exports.EVENT_FUNCTION_FINISHED, this.threadID);
                                            break;
                                        case exports.EVENT_EXITED_NORMALLY:
                                            // Kill debugger
                                            this.sendCommand('quit');
                                            this.emit(reason);
                                            break;
                                        case exports.EVENT_SIGNAL:
                                            if (this.handleSIGINT) {
                                                this.emit(reason, this.threadID);
                                            }
                                            else {
                                                // Reset for next signal since commands are honored in sync
                                                this.handleSIGINT = true;
                                            }
                                            break;
                                        default:
                                            throw new Error('unknown stop reason: ' + reason);
                                    }
                                }
                                break;
                            }
                            case MIParser_1.RUNNING: {
                                let tid, all;
                                this.threadID = -1;
                                all = false;
                                // If threadID is not a number, this means all threads have continued
                                tid = parseInt(record.getResult('thread-id'));
                                if (isNaN(tid)) {
                                    tid = this.threadID;
                                    all = true;
                                }
                                // For now we assume all threads resume execution
                                this.emit(exports.EVENT_RUNNING, this.threadID, all);
                                break;
                            }
                        }
                        break;
                    case AsyncRecord_1.AsyncRecordType.NOTIFY:
                        // Listen for thread events
                        if (record.getClass() === exports.EVENT_THREAD_NEW) {
                            this.emit(exports.EVENT_THREAD_NEW, record.getResult('id'));
                        }
                        else if (this.sharedLibraries.length &&
                            record.getClass() === exports.EVENT_SOLIB_LOADED) {
                            // If deferred symbol loading is enabled, check that
                            // the shared library loaded is in the user specified
                            // whitelist. If not, unload it
                            const libLoaded = path.basename(record.getResult('id'));
                            if (this.sharedLibraries.indexOf(libLoaded) > -1) {
                                this.log(`Loading ${libLoaded}`);
                                this.sendCommand(`sharedlibrary ${libLoaded}`);
                            }
                        }
                        break;
                    case AsyncRecord_1.AsyncRecordType.STATUS:
                        break;
                }
                break;
            case ResultRecord_1.ResultRecord:
                // Fulfill promise on stack
                if (!isNaN(record.getToken())) {
                    const handler = this.handlers[record.getToken()];
                    if (handler) {
                        handler(record);
                        delete this.handlers[record.getToken()];
                    }
                    else {
                        // There could be instances where we should fire DAP
                        // events even if the request did not originally contain
                        // a handler. For example, up/down should correctly move
                        // the active stack frame in VSCode
                    }
                }
                break;
            case StreamRecord_1.StreamRecord:
                // Forward raw GDB output to debug console
                break;
        }
    }
    clearBreakpoints() {
        return this.sendCommand('-break-delete');
    }
    setBreakpoints(sourceFile, bps) {
        return new Promise((resolve, reject) => {
            const bpsPending = [];
            const bpsVerified = [];
            if (bps) {
                bps.forEach((bp) => {
                    // If using filenames only, strip out path
                    if (!this.useAbsoluteFilePaths) {
                        sourceFile = path.basename(sourceFile);
                    }
                    let promise = this.sendCommand(`-break-insert -f ${sourceFile}:${bp.line}`);
                    bpsPending.push(promise);
                    promise.then((record) => {
                        // If this is a conditional breakpoint we must relay the
                        // expression to GDB and update the breakpoint
                        const bpInfo = record.getResult('bkpt');
                        if (bp.condition) {
                            promise = this.sendCommand(`-break-condition ${bpInfo.number} ${bp.condition}`);
                            promise.then((record) => {
                                bpsVerified.push(new vscode_debugadapter_1.Breakpoint(true, bpInfo.line));
                            });
                        }
                        else {
                            bpsVerified.push(new vscode_debugadapter_1.Breakpoint(true, bpInfo.line));
                        }
                    });
                });
                Promise.all(bpsPending).then(brkpoints => {
                    resolve(bpsVerified);
                });
            }
            else {
                // No breakpoints to verify
                resolve([]);
            }
        });
    }
    startInferior() {
        // Launch the debuggee target -- we need to do some magic here to hide
        // the longstanding GDB bug when redirecting inferior output to a
        // different tty. So we clear the active terminal and continue on our
        // merry way.
        return new Promise((resolve, reject) => {
            this.sendCommand('-gdb-set target-async on').then(() => {
                return this.sendCommand('-exec-run').then(() => {
                    // TODO: timing on this seems to be off for remoteSSH
                    vscode.commands
                        .executeCommand('workbench.action.terminal.clear')
                        .then(() => {
                        resolve(true);
                    });
                });
            });
        });
    }
    attachInferior() {
        // Only for attach requests
        return new Promise((resolve, reject) => {
            this.sendCommand('-gdb-set target-async on').then(() => {
                this.sendCommand(`attach ${this.PID}`).then(() => {
                    // TODO: will likely need to clear terminal as well like in launchRequest
                    return this.sendCommand('-exec-continue').then(() => {
                        resolve(true);
                    });
                });
            });
        });
    }
    evaluateExpr(expr, frameID) {
        return new Promise((resolve, reject) => {
            let cmd = '-data-evaluate-expression';
            if (frameID) {
                // "normalize" frameID with threadID
                frameID = frameID - this.threadID + 1;
                cmd += ` --frame ${frameID} --thread ${this.threadID}`;
            }
            cmd += ` "${expr}"`;
            this.sendCommand(cmd).then((record) => {
                resolve(this.sanitize(record.getResult('value'), false));
            });
        });
    }
    // This is a little different than the evaluate expr fcn as the expr to be
    // evaluated may be composed of various calls and other gdb commands, so
    // we pipe it as if the user would have typed it at the CL
    execUserCmd(expr, frameID) {
        return new Promise((resolve, reject) => {
            let cmd = '-interpreter-exec';
            if (frameID) {
                // "normalize" frameID with threadID
                frameID = frameID - this.threadID + 1;
                cmd += ` --frame ${frameID} --thread ${this.threadID}`;
            }
            cmd += ` console "${expr}"`;
            this.sendCommand(cmd).then((record) => {
                // If an error has resulted, also send an error event to show it to the user
                if (record.getClass() === MIParser_1.ERROR) {
                    this.emit(exports.EVENT_ERROR, record.getResult('msg').replace(/\\/g, ''));
                }
                resolve(record.getResult('value'));
            });
            // If this was an up or down command, send a continued and paused
            // event to trick VSCode into re-requesting the stacktrace.
            // TODO: this will not cause the right stackframe to be selected as
            // the debug adapter protocol does not support this
            // See https://github.com/microsoft/debug-adapter-protocol/issues/118
            if (expr === 'up' || expr === 'down') {
                this.emit(exports.EVENT_RUNNING, this.threadID, true);
                this.emit(exports.EVENT_PAUSED);
            }
        });
    }
    getThreads() {
        return new Promise((resolve, reject) => {
            this.sendCommand('-thread-info').then((record) => {
                const threadsResult = [];
                const threads = record.getResult('threads');
                for (let i = 0, len = threads.length; i < len; i++) {
                    const thread = new vscode_debugadapter_1.Thread(parseInt(threads[i].id), threads[i].name);
                    threadsResult.push(thread);
                }
                resolve(threadsResult);
            });
        });
    }
    isStopped() {
        return this.threadID !== -1;
    }
    getStack(threadID) {
        return new Promise((resolve, reject) => {
            this.sendCommand(`-stack-list-frames --thread ${threadID}`).then((record) => {
                const stackFinal = [];
                record.getResult('stack').forEach((frame) => {
                    frame = frame[1];
                    stackFinal.push(new vscode_debugadapter_1.StackFrame(threadID + parseInt(frame.level), frame.func, new vscode_debugadapter_1.Source(frame.file, frame.fullname), parseInt(frame.line)));
                });
                resolve(stackFinal);
            });
        });
    }
    getVars(reference) {
        return new Promise((resolve, reject) => {
            // TODO: support more than just frame locals
            this.sendCommand(`-stack-list-variables --thread ${this.threadID} --frame ${reference - this.threadID} --all-values`).then((record) => {
                resolve(record.getResult('variables'));
            });
        });
    }
    next(threadID) {
        return this.sendCommand(`-exec-next --thread ${threadID}`);
    }
    continue(threadID) {
        if (threadID) {
            return this.sendCommand(`-exec-continue --thread ${threadID}`);
        }
        else {
            return this.sendCommand('-exec-continue');
        }
    }
    stepIn(threadID) {
        return this.sendCommand(`-exec-step --thread ${threadID}`);
    }
    stepOut(threadID) {
        return this.sendCommand(`-exec-finish --thread ${threadID}`);
    }
    // If catchSignal is false, we will not emit a stopped event. This is a
    // workaround for automatically pausing the debugger for user executed
    // commands while the inferior is running
    pause(threadID, catchSignal) {
        if (catchSignal !== undefined && !catchSignal) {
            this.handleSIGINT = false;
        }
        return this.sendCommand(`-exec-interrupt ${threadID || ''}`);
    }
    quit(attach) {
        return new Promise((resolve, reject) => {
            if (attach) {
                this.sendCommand('detach');
            }
            this.dispose();
            return this.sendCommand('-gdb-exit');
        });
    }
    updateVar(variable, val) {
        return this.sendCommand(`set var ${variable} = ${val}`);
    }
    dispose() {
        if (this.terminal) {
            this.terminal.destroy();
        }
    }
}
exports.GDB = GDB;


/***/ }),
/* 26 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.MIParser = exports.ERROR = exports.RUNNING = exports.STOPPED = void 0;
const AsyncRecord_1 = __webpack_require__(27);
const StreamRecord_1 = __webpack_require__(29);
const ResultRecord_1 = __webpack_require__(30);
// MI grammar based on https://ftp.gnu.org/old-gnu/Manuals/gdb/html_chapter/gdb_22.html
// First sets below -- Regex exprs defined with `` need to escape \ char
const VARIABLE = /^([a-zA-Z_][a-zA-Z0-9_\-]*)/;
const TOKEN = '\\d*';
const ASYNC_RECORD = '[\\*\\+\\=]';
const STREAM_RECORD = '[\\~\\@\\&]';
const CSTRING = /^\"((\\.|[^"])*)\"/;
const OUT_OF_BAND_RECORD = new RegExp(`^(?:(${TOKEN})(${ASYNC_RECORD})|(${STREAM_RECORD}))`);
const RESULT_RECORD = new RegExp(`^(${TOKEN})\\^(done|running|connected|error|exit)`);
const ASYNC_CLASS = /^([_a-zA-Z0-9\-]*)/;
const GDB_PROMPT = '(gdb)';
exports.STOPPED = 'stopped';
exports.RUNNING = 'running';
exports.ERROR = 'error';
const VALUE_CSTRING = '"';
const VALUE_TUPLE = '{';
const VALUE_LIST = '[';
// Relative ordering of records in an OUT_OF_BAND_RECORD regexp
const TOKEN_POS = 1;
const ASYNC_RECORD_POS = 2;
const STREAM_RECORD_POS = 3;
class MIParser {
    constructor() {
        this.buffer = '';
        this.token = 0;
    }
    parse(str) {
        let record;
        this.buffer = str;
        try {
            // ( out-of-band-record )* [ result-record ] "(gdb)" nl
            record = this.parseOutOfBandRecord();
            if (!record) {
                record = this.parseResultRecord();
            }
            if (!record) {
                // (gdb) -- if not the inferior produced stdout
                if (this.buffer.trimRight() == GDB_PROMPT) {
                    return null;
                }
                else {
                    // Print to output window
                }
            }
        }
        catch (error) {
            // Throw to adapter
            console.error('Parser error: ' + error.message);
            throw error;
        }
        // DEBUG only
        if (record) {
            record.response = str;
        }
        return record;
    }
    parseToken(match) {
        if (match[TOKEN_POS] != '') {
            this.token = parseInt(match[TOKEN_POS]);
        }
        else {
            this.token = NaN;
        }
        return this.token;
    }
    parseOutOfBandRecord() {
        // async-record | stream-record
        let match;
        if ((match = OUT_OF_BAND_RECORD.exec(this.buffer))) {
            this.parseToken(match);
            if (match[ASYNC_RECORD_POS]) {
                return this.parseAsyncRecord();
            }
            else if (match[STREAM_RECORD_POS]) {
                return this.parseStreamRecord();
            }
            else {
                throw new Error('Expected to find AsyncRecord or StreamRecord');
            }
        }
        else
            return null;
    }
    parseAsyncRecord() {
        // exec-async-output | status-async-output | notify-async-output
        // First character denotes result class
        let match, result;
        const record = new AsyncRecord_1.AsyncRecord(this.token);
        record.setType(this.buffer[0]);
        this.buffer = this.buffer.substring(this.buffer[0].length);
        if ((match = ASYNC_CLASS.exec(this.buffer))) {
            // async-output ==> async-class ( "," result )* nl
            record.setClass(match[1]);
            this.buffer = this.buffer.substring(match[0].length);
            while (this.buffer[0] == ',') {
                // Consume , and read result
                this.buffer = this.buffer.substr(1);
                if ((result = this.parseResult())) {
                    record.addResult(result);
                }
            }
        }
        else {
            throw new Error('Failed to parse AsyncRecord');
        }
        return record;
    }
    parseStreamRecord() {
        // TODO
        return new StreamRecord_1.StreamRecord(1);
    }
    parseResultRecord() {
        // [ token ] "^" result-class ( "," result )* nl
        let match, record;
        if ((match = RESULT_RECORD.exec(this.buffer))) {
            record = new ResultRecord_1.ResultRecord(this.parseToken(match));
            record.setClass(match[2]);
            // Consume first part of match, parse results*
            this.buffer = this.buffer.substring(match[0].length);
            while (this.buffer[0] == ',') {
                // Consume , and read result
                this.buffer = this.buffer.substr(1);
                const result = this.parseResult();
                if (result) {
                    record.addResult(result);
                }
            }
            return record;
        }
        else {
            return null;
        }
    }
    parseResult() {
        let match;
        if ((match = VARIABLE.exec(this.buffer))) {
            // Also consume '='
            this.buffer = this.buffer.substring(match[0].length + 1);
            return [match[1], this.parseValue()];
        }
        else {
            return null;
        }
    }
    parseValue() {
        // value ==> const | tuple | list
        switch (this.buffer[0]) {
            case VALUE_CSTRING:
                return this.parseCString();
            case VALUE_TUPLE:
                return this.parseTuple();
            case VALUE_LIST:
                return this.parseList();
            default:
                return null;
        }
    }
    parseCString() {
        let match;
        if ((match = CSTRING.exec(this.buffer))) {
            // Consume corresponding '"'
            this.buffer = this.buffer.substring(match[0].length);
            return match[1];
        }
        else {
            throw new Error('could not parse cstring: ' + this.buffer);
        }
    }
    parseTuple() {
        // tuple ==> "{}" | "{" result ( "," result )* "}"
        let result;
        const tuple = {};
        do {
            // Skip over , or {
            this.buffer = this.buffer.substring(1);
            if ((result = this.parseResult())) {
                tuple[result[0]] = result[1];
            }
        } while (this.buffer[0] == ',');
        // Conbsume last }
        this.buffer = this.buffer.substring(1);
        return tuple;
    }
    parseList() {
        // list ==> "[]" | "[" value ( "," value )* "]" | "[" result ( "," result )* "]"
        let match;
        const list = [];
        // Consume first [
        this.buffer = this.buffer.substring(1);
        // Is this a list of values or list of results?
        if ([VALUE_CSTRING, VALUE_LIST, VALUE_TUPLE].indexOf(this.buffer[0]) != -1) {
            // Value list
            while ((match = this.parseValue())) {
                this.buffer = this.buffer.substring(1);
                list.push(match);
            }
        }
        else {
            // Result list
            while ((match = this.parseResult())) {
                this.buffer = this.buffer.substring(1);
                list.push(match);
            }
        }
        // If empty list, eat analogous ]
        if (!list.length) {
            this.buffer = this.buffer.substring(1);
        }
        return list;
    }
}
exports.MIParser = MIParser;


/***/ }),
/* 27 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.AsyncRecord = exports.AsyncRecordType = void 0;
const Record_1 = __webpack_require__(28);
var AsyncRecordType;
(function (AsyncRecordType) {
    AsyncRecordType["EXEC"] = "*";
    AsyncRecordType["STATUS"] = "+";
    AsyncRecordType["NOTIFY"] = "=";
})(AsyncRecordType = exports.AsyncRecordType || (exports.AsyncRecordType = {}));
class AsyncRecord extends Record_1.Record {
    constructor(token) {
        super(token);
    }
}
exports.AsyncRecord = AsyncRecord;


/***/ }),
/* 28 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.Record = void 0;
class Record {
    constructor(token) {
        this.response = '';
        this.token = token;
        this.results = new Map();
    }
    getToken() {
        return this.token;
    }
    setType(type) {
        this.type = type;
    }
    getType() {
        return this.type;
    }
    setClass(klass) {
        this.klass = klass;
    }
    getClass() {
        return this.klass;
    }
    addResult(result) {
        this.results.set(result[0], result[1]);
    }
    getResult(key) {
        return this.results.get(key);
    }
    // Strip slashes, remove token identifier
    prettyPrint() {
        //return this.response.substring(2, this.response.length - 1);
        return this.response;
    }
}
exports.Record = Record;


/***/ }),
/* 29 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.StreamRecord = void 0;
const Record_1 = __webpack_require__(28);
var StreamRecordType;
(function (StreamRecordType) {
    StreamRecordType["CONSOLE"] = "~";
    StreamRecordType["TARGET"] = "@";
    StreamRecordType["LOG"] = "&";
})(StreamRecordType || (StreamRecordType = {}));
class StreamRecord extends Record_1.Record {
    constructor() {
        super(...arguments);
        this.typeEnum = StreamRecordType;
    }
}
exports.StreamRecord = StreamRecord;


/***/ }),
/* 30 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.ResultRecord = exports.ResultRecordType = void 0;
const Record_1 = __webpack_require__(28);
var ResultRecordType;
(function (ResultRecordType) {
    ResultRecordType["DONE"] = "done";
    ResultRecordType["RUNNING"] = "running";
    ResultRecordType["CONNECTED"] = "connected";
    ResultRecordType["ERROR"] = "error";
    ResultRecordType["EXIT"] = "exit";
})(ResultRecordType = exports.ResultRecordType || (exports.ResultRecordType = {}));
class ResultRecord extends Record_1.Record {
    constructor(token) {
        super(token);
    }
}
exports.ResultRecord = ResultRecord;


/***/ }),
/* 31 */
/***/ (function(module, exports) {

module.exports = require("child_process");

/***/ })
/******/ ]);
//# sourceMappingURL=extension.js.map