/* eslint-disable @typescript-eslint/no-explicit-any */
import path = require('path');
import {clearInterval} from 'timers';
import {CompletionItem} from 'vscode';
import {Breakpoint, Source, StackFrame, Thread} from 'vscode-debugadapter';
// eslint-disable-next-line node/no-extraneous-import
import {DebugProtocol} from 'vscode-debugprotocol';
import {
  Debugger,
  DebuggerException,
  DebuggerVariable,
  DebuggingVerbosity,
  SCOPE_LOCAL,
  SCOPE_REGISTERS,
} from '../Debugger';
import {AsyncRecord, AsyncRecordType} from './parser/AsyncRecord';
import {ERROR, MIParser, RUNNING, STOPPED} from './parser/MIParser';
import {OutputRecord} from './parser/OutputRecord';
import {ResultRecord} from './parser/ResultRecord';
import {StreamRecord} from './parser/StreamRecord';

export const EVENT_OUTPUT = 'output';
export const EVENT_RUNNING = 'running';
export const EVENT_BREAKPOINT_HIT = 'breakpoint-hit';
export const EVENT_END_STEPPING_RANGE = 'end-stepping-range';
export const EVENT_FUNCTION_FINISHED = 'function-finished';
export const EVENT_EXITED_NORMALLY = 'exited-normally';
export const EVENT_SIGNAL = 'signal-received';
export const EVENT_PAUSED = 'paused';
export const EVENT_ERROR = 'error';
export const EVENT_ERROR_FATAL = 'error-fatal';
export const EVENT_THREAD_NEW = 'thread-created';
export const EVENT_SOLIB_LOADED = 'library-loaded';
export const EVENT_SOLIB_ADD = 'solib-event';
class GDBException extends DebuggerException {
  name: string;
  location: string;

  constructor(record: OutputRecord) {
    super();
    const frame = record.getResult('frame');
    (this.name = `${record.getResult('signal-meaning')} (${record.getResult(
      'signal-name'
    )})`),
      (this.location = `${frame.addr} in ${frame.func} at ${frame.file}:${frame.line}`);
  }
}
export class GDB extends Debugger {
  // Default path to MI debugger. If none is specified in the launch config
  // we will fallback to this path
  protected debuggerPath = 'gdb';

  // Arguments to pass to GDB. These will be combined with any that need to
  //  threaded to the inferior process
  private debuggerLaunchArguments = ['--interpreter=mi', '--tty=`tty`', '-q'];

  // This instance will handle all MI output parsing
  private parser: MIParser = new MIParser();

  // Used to sync MI inputs and outputs. Value increases by 1 with each
  // command issued
  private token = 0;

  // Output buffering for stdout pipe
  private outputBuffer = '';

  // Libraries for which debugger has loaded debug symbols for
  private loadedLibraries = new Map<string, boolean>();

  // Callbacks to execute when a command identified by "token" is resolved
  // by the debugger
  private handlers: {[token: number]: (record: OutputRecord) => void} = [];

  private breakpoints = new Map<string, number[]>();
  private logBreakpoints = new Map<number, string>();
  private functionBreakpoints = new Map<string, number>();
  private exceptionBreakpoints = new Map<string, number>();

  // Mapping of symbolic variable names to GDB variable references
  private variables = new Map<number, DebuggerVariable>();

  // Mapping of register numbers to their names
  private registers: string[] = [];

  private ignorePause = false;

  public spawnDebugger(): Promise<boolean> {
    throw new Error('Method not implemented.');
  }

  protected handleInferiorOutput(data: any): void {
    let record: OutputRecord | null;
    this.outputBuffer += data.toString('utf8');

    // We may be receiving buffered output. In such case defer parsing until
    // full output has been transmitted as denoted by a trailing newline
    const nPos = this.outputBuffer.lastIndexOf('\n');

    if (nPos !== -1) {
      // If multiple lines have buffered, handle each one
      const lines = this.outputBuffer.substr(0, nPos).split('\n') as string[];

      // Flush output buffer for next round of output
      this.outputBuffer = this.outputBuffer.substring(nPos + 1);

      lines.forEach(line => {
        try {
          if ((record = this.parser.parse(line))) {
            this.handleParsedResult(record);
          }
        } catch (error: unknown) {
          this.emit(EVENT_ERROR_FATAL, error);
        }
      });
    }
  }

  private handleParsedResult(record: OutputRecord) {
    switch (record.constructor) {
      case AsyncRecord:
        this.handleAsyncRecord(record as AsyncRecord);
        break;

      case ResultRecord:
        this.handleResultRecord(record as ResultRecord);
        break;

      case StreamRecord:
        this.handleStreamRecord(record as StreamRecord);
        break;
    }
  }

  private handleStreamRecord(record: StreamRecord) {
    // Forward raw GDB output to debug console
    this.emit(
      EVENT_OUTPUT,
      this.sanitize(record.prettyPrint(), true),
      'console'
    );
  }

  private handleResultRecord(record: ResultRecord) {
    if (!isNaN(record.getToken())) {
      const handler = this.handlers[record.getToken()];

      if (handler) {
        handler(record);
        delete this.handlers[record.getToken()];
      } else {
        // There could be instances where we should fire DAP
        // events even if the request did not originally contain
        // a handler. For example, up/down should correctly move
        // the active stack frame in VSCode
      }
    }
  }

  private handleAsyncRecord(record: AsyncRecord) {
    const handleStatus = () => {
      // TODO
    };

    const handleNotify = () => {
      // Listen for thread events
      switch (record.getClass()) {
        case EVENT_THREAD_NEW:
          this.emit(EVENT_THREAD_NEW, record.getResult('id'));
          break;

        case EVENT_SOLIB_LOADED:
          {
            // If deferred symbol loading is enabled, check that the
            // shared library loaded is in the user specified list.
            const libLoaded = path.basename(record.getResult('id'));
            if (this.sharedLibraries.indexOf(libLoaded) > -1) {
              this.loadedLibraries.set(libLoaded, true);
            }
          }
          break;
      }
    };

    const handleExec = () => {
      switch (record.getClass()) {
        case STOPPED:
          {
            const stoppedReason = record.getResult('reason');
            this.threadID = parseInt(record.getResult('thread-id'));

            // No stopped reason is emitted when reverse debugging occurrs
            if (
              !stoppedReason &&
              (this.attachPID || this.enableReverseDebugging)
            ) {
              this.emit(EVENT_BREAKPOINT_HIT, this.threadID);
              return;
            }

            switch (stoppedReason) {
              case EVENT_BREAKPOINT_HIT:
              case EVENT_END_STEPPING_RANGE:
              case EVENT_FUNCTION_FINISHED:
                // These events don't necessitate any special changes
                // on the debugger itself. Simply bubble up the event
                // to the debug session. If this is the result of a logging
                // breakpoint, do not stop
                if (stoppedReason === EVENT_BREAKPOINT_HIT) {
                  const bkpt = record.getResult('bkptno');
                  const msg = this.logBreakpoints.get(bkpt);

                  if (msg) {
                    this.printLogPoint(msg).then(msgFormtted => {
                      this.emit(EVENT_OUTPUT, msgFormtted, 'stdout');
                    });
                  }
                }

                this.emit(stoppedReason, this.threadID);
                break;

              case EVENT_EXITED_NORMALLY:
                // The inferior has finished execution. Take down the
                // debugger and inform the debug session that there
                // is nothing else to debug.
                this.sendCommand('quit');
                this.emit(EVENT_EXITED_NORMALLY);
                break;

              case EVENT_SIGNAL:
                if (!this.ignorePause) {
                  this.lastException = new GDBException(record);
                  this.emit(EVENT_SIGNAL, this.threadID);
                }
                break;

              case EVENT_SOLIB_ADD:
                // This event will only be hit if the user has
                // explicitly specified a set of shared libraries
                // for deferred symbol loading so we need not check
                // for the presence of such setting
                this.sharedLibraries.forEach((library: string) => {
                  if (this.loadedLibraries.get(library)) {
                    this.sendCommand(`sharedlibrary ${library}`);

                    // Do not load shared libraries more than once
                    // This is more of a standing hack, and should be
                    // revisited with a more robust solution as a shared
                    // library could be closed by the inferior and need to
                    // be reloaded again (i.e. we must add it back)
                    this.loadedLibraries.delete(library);
                  }
                });

                this.continue();
                break;

              default:
                throw new Error('Unknown stop reason');
            }
          }
          break;

        case RUNNING:
          // When the inferior resumes execution, remove all tracked
          // variables which were used to service variable reference IDs
          this.threadID = -1;

          this.clearDebuggerVariables().then(() => {
            this.emit(EVENT_RUNNING, this.threadID, isNaN(this.threadID));
          });
          break;
      }
    };

    // Notify GDB client of status change
    switch (record.getType()) {
      case AsyncRecordType.EXEC:
        handleExec();
        break;

      case AsyncRecordType.NOTIFY:
        handleNotify();
        break;

      case AsyncRecordType.STATUS:
        handleStatus();
        break;
    }
  }

  public launchInferior(): Promise<boolean> {
    return new Promise(resolve => {
      // If reverse debugging is enabled, start the process but immediately break
      // to record the underlying inferior. Note that as of GDB 8.1, there is
      // a starti instruction which fulfills this exact requirement, but we
      // cannot assume the underlying debugger is always at least this version
      // To work around this, we attempt to set a breakpoint at address 0x0
      // to force the debugger to stop, issue the record command, delete the
      // breakpoint and then resume execution. This idea is taken from:
      // https://reverseengineering.stackexchange.com/questions/8724/set-a-breakpoint-on-gdb-entry-point-for-stripped-pie-binaries-without-disabling/8748#8748
      if (this.enableReverseDebugging) {
        this.sendCommand('-break-insert main').then(
          (breakpoint: OutputRecord) => {
            const bkptNumber = parseInt(breakpoint.getResult('bkpt').number);

            this.sendCommand('-exec-run').then(() => {
              this.sendCommand('record').then(() => {
                this.sendCommand(`-break-delete ${bkptNumber}`).then(() => {
                  this.continue().then(() => {
                    // It is important that we send this command LAST in this
                    // sequence as this will affect the very intricate structure
                    // of commands we've issued prior. Running this first will
                    // cause us to issue the record command prior to hitting the
                    // start breakpoint
                    this.sendCommand('-gdb-set target-async on').then(() => {
                      resolve(true);
                    });
                  });
                });
              });
            });
          }
        );
      } else {
        this.sendCommand('-gdb-set target-async on').then(() => {
          // Attach or launch inferior
          if (this.attachPID) {
            this.sendCommand(`attach ${this.attachPID}`).then(() => {
              // If deferred symbol loading is enabled, make sure we have debug symbols in memory
              // if such libraries have already been loaded by the process prior to GDB attachment
              if (this.sharedLibraries.length) {
                const pending: Promise<OutputRecord>[] = [];

                // Selectively load libraries
                this.sharedLibraries.forEach(library => {
                  pending.push(this.sendCommand(`sharedlibrary ${library}`));
                });

                Promise.all(pending).then(() => {
                  resolve(true);
                });
              } else {
                this.sendCommand('-gdb-show auto-solib-add').then(
                  (result: OutputRecord) => {
                    if (result.getResult('value') !== 'off') {
                      this.sendCommand('sharedlibrary').then(() =>
                        resolve(true)
                      );
                    } else {
                      resolve(true);
                    }
                  }
                );
              }
            });
          } else {
            this.sendCommand('-exec-run').then(() => {
              resolve(true);
            });
          }
        });
      }
    });
  }

  public attachInferior(): Promise<any> {
    throw new Error('Method not implemented.');
  }

  public clearBreakpoints(fileName: string): Promise<boolean> {
    return new Promise(resolve => {
      const pending: Promise<OutputRecord>[] = [];
      const breakpoints = this.breakpoints.get(fileName);
      if (breakpoints) {
        breakpoints.forEach((breakpoint: number) => {
          pending.push(this.sendCommand(`-break-delete ${breakpoint}`));

          if (this.logBreakpoints.get(breakpoint)) {
            this.logBreakpoints.delete(breakpoint);
          }
        });

        Promise.all(pending).then(() => {
          this.breakpoints.delete(fileName);
          resolve(true);
        });
      } else {
        resolve(true);
      }
    });
  }

  public continue(threadID?: number): Promise<any> {
    this.ignorePause = false;

    if (threadID) {
      return this.sendCommand(`-exec-continue --thread ${threadID}`);
    } else {
      return this.sendCommand('-exec-continue');
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public reverseContinue(threadID?: number): Promise<any> {
    return this.sendCommand('rc');
  }

  public getStackTrace(threadID: number): Promise<DebugProtocol.StackFrame[]> {
    return new Promise(resolve => {
      this.sendCommand(`-stack-list-frames --thread ${threadID}`).then(
        (record: ResultRecord) => {
          const stackFinal: DebugProtocol.StackFrame[] = [];
          record.getResult('stack').forEach((frame: any) => {
            frame = frame[1];

            const sf: DebugProtocol.StackFrame = new StackFrame(
              threadID + parseInt(frame.level),
              frame.func,
              new Source(
                frame.file.split('\\').pop().split('/').pop(),
                frame.fullname
              ),
              parseInt(frame.line)
            );

            sf.instructionPointerReference = frame.addr;
            stackFinal.push(sf);
          });

          resolve(stackFinal);
        }
      );
    });
  }

  public getCommandCompletions(command: string): Promise<CompletionItem[]> {
    return new Promise(resolve => {
      this.sendCommand(`-complete "${command}"`).then(
        (record: OutputRecord) => {
          const items: CompletionItem[] = [];
          record.getResult('matches').forEach((match: string) => {
            items.push(new CompletionItem(match, 0));
          });

          resolve(items);
        }
      );
    });
  }

  public getDisassembly(
    memoryAddress: string
  ): Promise<DebugProtocol.DisassembledInstruction[]> {
    return new Promise(resolve => {
      this.sendCommand(`-data-disassemble -a ${memoryAddress} -- 0`).then(
        (record: OutputRecord) => {
          const insts = record.getResult('asm_insns');
          const dasm: DebugProtocol.DisassembledInstruction[] = [];

          insts.forEach(inst => {
            const instDasm: DebugProtocol.DisassembledInstruction = {
              address: inst.address,
              instruction: inst.inst,
            };

            dasm.push(instDasm);
          });
          resolve(dasm);
        }
      );
    });
  }

  public getThreads(): Promise<Thread[]> {
    return new Promise(resolve => {
      this.sendCommand('-thread-info').then((record: ResultRecord) => {
        const threadsResult: Thread[] = [];
        record.getResult('threads').forEach((thread: any) => {
          threadsResult.push(new Thread(parseInt(thread.id), thread.name));
        });

        resolve(threadsResult);
      });
    });
  }

  public getVariable(name: string): DebuggerVariable | undefined {
    return [...this.variables.values()].find(variable => {
      return variable.name === name;
    });
  }

  public setVariable(id: number, value: string): Promise<OutputRecord | null> {
    const variable = this.variables.get(this.getNormalizedVariableID(id));

    // This should always hit in the map. If it doesn't however, do not allow
    // the updating of this variable
    if (variable) {
      return this.sendCommand(`-var-assign ${variable.debuggerName} ${value}`);
    } else {
      return new Promise(resolve => {
        resolve(null);
      });
    }
  }

  /**
   * This is invoked for requesting all variables in all scopes. To distinguish
   * how we query the debugger, rely on artifically large scope identifiers
   */
  public getVariables(
    referenceID: number
  ): Promise<Map<number, DebuggerVariable>> {
    // Recursive method to correctly fetch children of pseudo scopes introduced
    // by the underlying MI debugger
    const getVariableChildren = (
      variableName: string
    ): Promise<Map<number, DebuggerVariable>> => {
      return new Promise(resolve => {
        this.sendCommand(
          `-var-list-children --simple-values "${variableName}"`
        ).then(children => {
          let childrenVariables = new Map();
          const pending: Promise<any>[] = [];

          children.getResult('children').forEach(child => {
            // Check to see if this is a pseudo child on an aggregate type
            // such as private, public, protected, etc. If so, traverse into
            // child and annotate its consituents with such attribute for
            // special treating by the front-end. Note we could have mulitple
            // such pseudo-levels at a given level
            if (this.isPseudoVariableChild(child[1])) {
              const pseudoPromise = getVariableChildren(child[1].name);
              pseudoPromise.then(variables => {
                childrenVariables = new Map([
                  ...childrenVariables,
                  ...variables,
                ]);
              });

              pending.push(pseudoPromise);
            } else {
              const newVariable: DebuggerVariable = {
                name: child[1].exp,
                debuggerName: child[1].name,
                numberOfChildren: parseInt(child[1].numchild),
                referenceID:
                  this.variables.size + 1 + childrenVariables.size + 1,
                value: child[1].value || '',
                type: child[1].type,
              };

              childrenVariables.set(newVariable.referenceID, newVariable);
            }
          });

          Promise.all(pending).then(() => {
            this.variables = new Map([...this.variables, ...childrenVariables]);
            resolve(childrenVariables);
          });
        });
      });
    };

    return new Promise(resolve => {
      if (referenceID < SCOPE_LOCAL) {
        // Fetch children variables for an existing variable
        const variable = this.variables.get(referenceID);

        if (variable) {
          getVariableChildren(variable.debuggerName).then(variables =>
            resolve(variables)
          );
        } else {
          // We should never hit this branch as we would never have requested
          // additional information for such variable referenceID
          resolve(new Map());
        }
      } else if (referenceID < SCOPE_REGISTERS) {
        // Fetch root level locals
        this.clearDebuggerVariables().then(() => {
          this.sendCommand(
            `-stack-list-variables --thread ${this.threadID} --frame ${
              referenceID - SCOPE_LOCAL - this.threadID
            } --no-frame-filters --simple-values`
          ).then((record: OutputRecord) => {
            const pending: Promise<DebuggerVariable>[] = [];

            // Ask GDB to create a new variable so we can correctly display nested
            // variables via reference IDs. When execution is resumed, delete all
            // temporarily created variables to avoid polluting future breaks
            record.getResult('variables').forEach(variable => {
              pending.push(this.createVariable(variable.name));
            });

            Promise.all(pending).then(() => {
              // Resolve outer promise once all prior promises have completed
              resolve(this.variables);
            });
          });
        });
      } else {
        // Fetch registers -- TODO: group registers like variables
        this.sendCommand('-data-list-register-values r').then(
          (record: OutputRecord) => {
            resolve(
              record
                .getResult('register-values')
                .map(reg => {
                  return {
                    name: this.registers[reg.number],
                    value: reg.value,
                  };
                })
                .filter(reg => reg.name)
            );
          }
        );
      }
    });
  }

  public next(threadID: number, granularity: string): Promise<OutputRecord> {
    if (granularity === 'instruction') {
      return this.sendCommand(`-exec-next-instruction --thread ${threadID}`);
    } else {
      // Treat a line as being synonymous with a statement
      return this.sendCommand(`-exec-next --thread ${threadID}`);
    }
  }

  public pause(threadID?: number, ignorePause?: boolean): Promise<boolean> {
    return new Promise(resolve => {
      if (this.isStopped()) {
        resolve(true);
      } else {
        if (ignorePause) {
          this.ignorePause = true;
        }

        this.sendCommand(`-exec-interrupt ${threadID || ''}`).then(() => {
          resolve(false);
        });
      }
    });
  }

  public sendCommand(command: string): Promise<OutputRecord> {
    this.log(command);

    return new Promise(resolve => {
      command = `${++this.token + command}\n`;
      this.inferiorInputHandle.write(command);

      if (this.debug === DebuggingVerbosity.VERBOSE) {
        this.emit(EVENT_OUTPUT, this.sanitize(command.slice(0, -1)), 'stdout');
      }

      this.handlers[this.token] = (record: OutputRecord) => {
        this.log(record.prettyPrint());

        if (this.debug === DebuggingVerbosity.VERBOSE) {
          this.emit(
            EVENT_OUTPUT,
            this.sanitize(record.prettyPrint(), true),
            'console'
          );
        }

        resolve(record);
      };
    });
  }

  public sendUserCommand(
    command: string,
    frameID?: number
  ): Promise<ResultRecord> {
    return new Promise(resolve => {
      let cmd = '-interpreter-exec';

      if (frameID) {
        // "normalize" frameID with threadID
        frameID = frameID - this.threadID + 1;
        cmd = `${cmd} --frame ${frameID} --thread ${this.threadID}`;
      }

      // Escape any quotes in user input
      cmd = `${cmd} console "${this.escapeQuotes(command)}"`;

      this.sendCommand(cmd).then((record: ResultRecord) => {
        // If an error has resulted, also send an error event to show it to the user
        if (record.getClass() === ERROR) {
          this.emit(
            EVENT_ERROR,
            this.escapeEscapeCharacters(record.getResult('msg'))
          );
        }

        // TODO: if this was a stack navigation command, update the callstack
        // with the correct newly selected stackframe. Currently, the debug
        // adapter protocol does not support such behavior. See:
        // https://github.com/microsoft/debug-adapter-protocol/issues/118
        resolve(record);
      });
    });
  }

  public evaluateExpression(expr: string, frameID?: number): Promise<any> {
    return new Promise(resolve => {
      let cmd = '-data-evaluate-expression';

      if (frameID) {
        // "normalize" frameID with threadID
        frameID = frameID - this.threadID + 1;
        cmd += ` --frame ${frameID} --thread ${this.threadID}`;
      }

      cmd += ` "${expr}"`;

      this.sendCommand(cmd).then((record: ResultRecord) => {
        const r = record.getResult('value');

        if (r) {
          resolve(this.sanitize(r, false));
        } else {
          resolve(null);
        }
      });
    });
  }

  public setExceptionBreakpoints(filter: string[]): Promise<boolean> {
    return new Promise(resolve => {
      this.clearExceptionBreakpoints().then(() => {
        const breakpointsPending: Promise<void>[] = [];

        filter.forEach((type: string) => {
          const cmd = this.sendCommand(`-catch-${type}`).then(result => {
            const bkpt = result.getResult('bkpt');
            this.exceptionBreakpoints.set(type, bkpt.number);
          });

          breakpointsPending.push(cmd);
        });

        Promise.all(breakpointsPending).then(() => {
          resolve(true);
        });
      });
    });
  }

  public setFunctionBreakpoints(
    breakpoints: DebugProtocol.FunctionBreakpoint[]
  ): Promise<Breakpoint[]> {
    return new Promise(resolve => {
      this.clearFunctionBreakpoints().then(() => {
        const breakpointsPending: Promise<void>[] = [];
        const breakpointsConfirmed: Breakpoint[] = [];

        breakpoints.forEach(breakpoint => {
          const cmd = this.sendCommand(`-break-insert ${breakpoint.name}`).then(
            result => {
              const bkpt = result.getResult('bkpt');

              this.functionBreakpoints.set(breakpoint.name, bkpt.number);

              breakpointsConfirmed.push(
                new Breakpoint(!bkpt.pending, bkpt.line)
              );
            }
          );

          breakpointsPending.push(cmd);
        });

        Promise.all(breakpointsPending).then(() => {
          resolve(breakpointsConfirmed);
        });
      });
    });
  }

  public setBreakpoints(
    fileName: string,
    breakpoints: DebugProtocol.SourceBreakpoint[]
  ): Promise<Breakpoint[]> {
    const getBreakpointInsertionCommand = (
      fileName: string,
      breakpoint: DebugProtocol.SourceBreakpoint
    ): string => {
      let cmd = `-f ${fileName}:${breakpoint.line}`;

      if (breakpoint.condition) {
        cmd = `-c "${this.escapeQuotes(breakpoint.condition)}" ${cmd}`;
      } else if (breakpoint.hitCondition) {
        cmd = `-i ${breakpoint.hitCondition} ${cmd}`;
      }

      return `-break-insert ${cmd}`;
    };

    return new Promise(resolve => {
      if (this.isDebuggerReady) {
        // There are instances where breakpoints won't properly bind to source locations
        // despite enabling async mode on GDB. To ensure we always bind to source, explicitly
        // pause the debugger, but do not react to the signal from the UI side so as to
        // not get the UI in an odd state
        this.pause(undefined, true).then(wasPaused => {
          this.clearBreakpoints(fileName).then(() => {
            const normalizedFileName = this.getNormalizedFileName(fileName);
            const breakpointsPending: Promise<void>[] = [];
            const breakpointsConfirmed: Breakpoint[] = [];
            const breakpointIDs: number[] = [];

            // Send each breakpoint to GDB. As GDB replies with acknowledgements of
            // the breakpoint being set, if the breakpoint has been bound to a source
            // location, mark the breakpoint as being verified. Further, irregardless
            // of whether or not a breakpoint has been bound to source, modify break
            // conditions if/when applicable. Note that since we issue commands sequentially
            // and the debugger will resolve commands in order, we fulfill the requirement
            // that breakpoints be returned in the same order requested
            breakpoints.forEach(srcBreakpoint => {
              breakpointsPending.push(
                this.sendCommand(
                  getBreakpointInsertionCommand(
                    normalizedFileName,
                    srcBreakpoint
                  )
                ).then((breakpoint: OutputRecord) => {
                  const bkpt = breakpoint.getResult('bkpt');
                  breakpointsConfirmed.push(
                    new Breakpoint(!bkpt.pending, bkpt.line)
                  );

                  if (srcBreakpoint.logMessage) {
                    this.logBreakpoints.set(
                      bkpt.number,
                      srcBreakpoint.logMessage
                    );
                  }

                  breakpointIDs.push(parseInt(bkpt.number));
                })
              );
            });

            Promise.all(breakpointsPending).then(() => {
              // Only return breakpoints GDB has actually bound to a source. Others
              // will be marked verified as the debugger binds them later on
              this.breakpoints.set(fileName, breakpointIDs);
              // This is one of the few requests that may be hit prior to the inferior
              // running. In such case, do not attempt to continue a process that has
              // yet to be started
              if (!wasPaused && this.inferiorRunning) {
                this.continue();
              }

              resolve(breakpointsConfirmed);
            });
          });
        });
      } else {
        const intv = setInterval(() => {
          if (this.isDebuggerReady) {
            clearInterval(intv);
            this.setBreakpoints(fileName, breakpoints).then(bps =>
              resolve(bps)
            );
          }
        }, 500);
      }
    });
  }

  public stepIn(threadID: number): Promise<OutputRecord> {
    return this.sendCommand(`-exec-step --thread ${threadID}`);
  }

  public stepOut(threadID: number): Promise<OutputRecord> {
    return this.sendCommand(`-exec-finish --thread ${threadID}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public stepBack(threadID: number): Promise<OutputRecord> {
    return this.sendCommand('reverse-step');
  }

  public startInferior(): Promise<any> {
    throw new Error('Method not implemented.');
  }

  public terminate(): Promise<any> {
    // If we attached, free the ptrace
    if (this.attachPID) {
      this.sendCommand('detach');
    }

    return this.sendCommand('-gdb-exit');
  }

  public createVariable(name: string): Promise<DebuggerVariable> {
    return new Promise(resolve => {
      this.sendCommand(`-var-create - * "${this.escapeQuotes(name)}"`).then(
        gdbVariable => {
          // Dyanmic GDB variables need also reference has_more to accurately determine
          // if they are a composite/aggregate type
          const childCount =
            parseInt(gdbVariable.getResult('numchild')) ||
            (parseInt(gdbVariable.getResult('dynamic')) &&
              parseInt(gdbVariable.getResult('has_more')));

          const variableValue = gdbVariable.getResult('value');
          const newVariable: DebuggerVariable = {
            name: name,
            debuggerName: gdbVariable.getResult('name'),
            numberOfChildren: childCount,
            referenceID: childCount ? this.variables.size + 1 : 0,
            value: variableValue,
            type: gdbVariable.getResult('type'),
          };

          this.variables.set(this.variables.size + 1, newVariable);

          resolve(newVariable);
        }
      );
    });
  }

  protected createDebuggerLaunchCommand(): string[] {
    // This idea is borrowed from the Microsoft cpptools VSCode extension.
    // It really is the only conceivable way to support running in the
    // integrated terminal. We spin on the GDB process to prevent the shell
    // from accepting normal commands. We set a trap handler to correctly
    // communicate inferior completion back to the debug adapter so we can
    // issue the corresponding TerminatedEvent and take down GDB. We issue
    // the +m command to hide the background "done" message when GDB
    // finishes debugging the inferior. These hacks probably won't work on Windows
    let args = [this.debuggerPath];
    args = args.concat(this.debuggerArgs, this.debuggerLaunchArguments);

    // Append any user specified arguments to the inferior
    if (this.type === 'launch') {
      // Launch request
      if (this.userSpecifiedDebuggerArguments) {
        args.push('--args');
        args.push(String(this.inferiorProgram));
        args = args.concat(this.userSpecifiedDebuggerArguments);
      } else {
        args.push(String(this.inferiorProgram));
      }
    } else {
      // Attach request
      // TODO: revisit this
      this.attachPID = Number(this.inferiorProgram);
    }

    args = args.concat(['<', this.inferiorInputFileName]);
    args = args.concat(['>', this.inferiorOutputFileName]);

    return args;
  }

  protected handlePostDebuggerStartup(): Promise<boolean> {
    return new Promise(resolve => {
      Promise.all([
        this.cacheRegisterNames(),
        this.deferSharedLibraryLoading(),
        this.sendCommand('-enable-pretty-printing'),
      ]).then(() => {
        resolve(true);
      });
    });
  }

  private clearDebuggerVariables(): Promise<boolean> {
    return new Promise(resolve => {
      if (this.variables.size) {
        const pending: Promise<OutputRecord>[] = [];

        this.variables.forEach(variable => {
          pending.push(
            this.sendCommand(`-var-delete ${variable.debuggerName}`)
          );
        });

        Promise.all(pending).then(() => {
          this.variables.clear();
          resolve(true);
        });
      } else {
        resolve(true);
      }
    });
  }

  private escapeQuotes(str: string): string {
    return str.replace(/"/g, '\\"');
  }

  private escapeEscapeCharacters(str: string): string {
    return str.replace(/\\/g, '');
  }

  private isPseudoVariableChild(child: any): boolean {
    return !child.type && !child.value;
  }

  private cacheRegisterNames(): Promise<boolean> {
    return new Promise(resolve => {
      this.sendCommand('-data-list-register-names').then(
        (record: OutputRecord) => {
          record
            .getResult('register-names')
            .forEach((reg: string, idx: number) => {
              this.registers[idx] = reg;
            });

          resolve(true);
        }
      );
    });
  }

  private deferSharedLibraryLoading(): Promise<boolean> {
    return new Promise(resolve => {
      if (this.sharedLibraries.length) {
        Promise.all([
          this.sendCommand('-gdb-set stop-on-solib-events 1'),
          this.sendCommand('-gdb-set auto-solib-add off'),
        ]).then(() => resolve(true));
      } else {
        resolve(false);
      }
    });
  }

  private getNormalizedVariableID(id: number): number {
    if (id < SCOPE_LOCAL) {
      return id;
    } else {
      return id - SCOPE_LOCAL;
    }
  }

  private clearFunctionBreakpoints(): Promise<boolean> {
    return new Promise(resolve => {
      const pending: Promise<OutputRecord>[] = [];

      this.functionBreakpoints.forEach((num: number) => {
        pending.push(this.sendCommand(`-break-delete ${num}`));
      });

      Promise.all(pending).then(() => {
        this.functionBreakpoints.clear();
        resolve(true);
      });
    });
  }

  private clearExceptionBreakpoints(): Promise<boolean> {
    return new Promise(resolve => {
      const pending: Promise<OutputRecord>[] = [];

      this.exceptionBreakpoints.forEach((num: number) => {
        pending.push(this.sendCommand(`-break-delete ${num}`));
      });

      Promise.all(pending).then(() => {
        this.exceptionBreakpoints.clear();
        resolve(true);
      });
    });
  }

  private printLogPoint(msg: string): Promise<string> {
    return new Promise(resolve => {
      const vars = msg.match(/{.*?}/g);

      if (vars) {
        const pending: Promise<boolean>[] = [];

        vars.forEach(v => {
          const varName = v.replace('{', '').replace('}', '');

          pending.push(
            new Promise(resolve => {
              this.sendCommand(`-var-create - * "${varName}"`).then(
                async vObj => {
                  this.sendCommand(
                    `-var-evaluate-expression ${vObj.getResult('name')}`
                  ).then(vRes => {
                    msg = msg.replace(v, vRes.getResult('value'));
                    resolve(true);
                  });
                }
              );
            })
          );
        });

        Promise.all(pending).then(() => {
          resolve(msg);
        });
      } else {
        resolve(msg);
      }
    });
  }
}
