import {resolve} from 'path';
import path = require('path');
import {CompletionItem} from 'vscode';
import {Breakpoint, Source, StackFrame, Thread} from 'vscode-debugadapter';
// eslint-disable-next-line node/no-extraneous-import
import {DebugProtocol} from 'vscode-debugprotocol';
import {
  Debugger,
  DebuggerException,
  DebuggerVariable,
  SCOPE_LOCAL,
  SCOPE_REGISTERS,
} from '../Debugger';
import {
  EVENT_BREAKPOINT_HIT,
  EVENT_END_STEPPING_RANGE,
  EVENT_ERROR,
  EVENT_ERROR_FATAL,
  EVENT_EXITED_NORMALLY,
  EVENT_FUNCTION_FINISHED,
  EVENT_OUTPUT,
  EVENT_RUNNING,
  EVENT_SIGNAL,
  EVENT_SOLIB_ADD,
  EVENT_SOLIB_LOADED,
  EVENT_THREAD_NEW,
} from './GDB';
import {AsyncRecord, AsyncRecordType} from './parser/AsyncRecord';
import {ERROR, MIParser, RUNNING, STOPPED} from './parser/MIParser';
import {OutputRecord} from './parser/OutputRecord';
import {ResultRecord} from './parser/ResultRecord';
import {StreamRecord} from './parser/StreamRecord';

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
export class GDBNew extends Debugger {
  // Default path to MI debugger. If none is specified in the launch config
  // we will fallback to this path
  protected debuggerPath = 'gdb';

  // Arguments to pass to GDB. These will be combined with any that need to
  //  threaded to the inferior process
  private debuggerLaunchArguments = ['--interpreter=mi', '-q', '--tty=`tty`'];

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

  // Mapping of symbolic variable names to GDB variable references
  private variables = new Map<number, DebuggerVariable>();

  public spawnDebugger(): Promise<any> {
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
        } catch (error: any) {
          this.emit(EVENT_ERROR_FATAL);
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
    this.emit(EVENT_OUTPUT, this.sanitize(record.prettyPrint(), true));
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

            switch (stoppedReason) {
              case EVENT_BREAKPOINT_HIT:
              case EVENT_END_STEPPING_RANGE:
              case EVENT_FUNCTION_FINISHED:
                // These events don't necessitate any special changes
                // on the debugger itself. Simply bubble up the event
                // to the debug session.
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
                this.lastException = new GDBException(record);
                this.emit(EVENT_SIGNAL, this.threadID);
                break;

              case EVENT_SOLIB_ADD:
                // This event will only be hit if the user has
                // explicitly specified a set of shared libraries
                // for deferred symbol loading so we need not check
                // for the presence of such setting
                this.sharedLibraries.forEach((library: string) => {
                  if (this.loadedLibraries.get(library)) {
                    this.sendCommand(`sharedlibrary ${library}`);
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
      this.sendCommand('-gdb-set target-async on').then(() => {
        this.sendCommand('-exec-run').then(() => {
          resolve(true);
        });
      });
    });
  }

  public attachInferior(): Promise<any> {
    throw new Error('Method not implemented.');
  }

  public clearBreakpoints(fileName: string): Promise<any> {
    throw new Error('Method not implemented.');
  }

  public continue(threadID?: number): Promise<any> {
    if (threadID) {
      return this.sendCommand(`-exec-continue --thread ${threadID}`);
    } else {
      return this.sendCommand('-exec-continue');
    }
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
              new Source(frame.file, frame.fullname),
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

  /**
   * This is invoked for requesting all variables in all scopes. To distinguish
   * how we query the debugger, rely on artifically large scope identifiers
   */
  public getVariables(
    referenceID: number
  ): Promise<Map<number, DebuggerVariable>> {
    const getVariableChildren = (
      variableName: string
    ): Promise<Map<number, DebuggerVariable>> => {
      return new Promise(resolve => {
        this.sendCommand(
          `-var-list-children --simple-values "${variableName}"`
        ).then(children => {
          const childrenVariables = new Map();

          children.getResult('children').forEach(child => {
            // Check to see if this is a pseudo child on an aggregate type
            // such as private, public, protected, etc. If so, traverse into
            // child and annotate its consituents with such attribute for
            // special treating by the front-end. Note we could have mulitple
            // such pseudo-levels at a given level
          });

          resolve(childrenVariables);
        });
      });
    };

    return new Promise(resolve => {
      if (referenceID < SCOPE_LOCAL) {
        // Fetch children variables for an existing variable
        const variable = this.variables.get(referenceID);

        if (variable) {
          getVariableChildren(variable.name).then(variables =>
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
            const pending: Promise<void>[] = [];

            // Ask GDB to create a new variable so we can correctly display nested
            // variables via reference IDs. When execution is resumed, delete all
            // temporarily created variables to avoid polluting future breaks
            record.getResult('variables').forEach(variable => {
              pending.push(
                this.sendCommand(`-var-create - * "${variable.name}"`).then(
                  gdbVariable => {
                    this.variables.set(this.variables.size + 1, {
                      name: variable.name,
                      numberOfChildren: parseInt(
                        gdbVariable.getResult('numchild')
                      ),
                      referenceID: this.variables.size + 1,
                      value: gdbVariable.getResult('value'),
                    });
                  }
                )
              );
            });

            Promise.all(pending).then(() => {
              // Resolve outer promise once all prior promises have completed
              resolve(this.variables);
            });
          });
        });
      } else {
        // Fetch registers
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

  public pause(threadID?: number): Promise<boolean> {
    return new Promise(resolve => {
      if (this.isStopped()) {
        resolve(true);
      } else {
        this.sendCommand(`-exec-interrupt ${threadID || ''}`).then(() => {
          resolve(false);
        });
      }
    });
  }

  public sendCommand(command: string): Promise<OutputRecord> {
    console.log(command);

    return new Promise(resolve => {
      command = `${++this.token + command}\n`;
      this.inferiorInputHandle.write(command);
      this.handlers[this.token] = (record: OutputRecord) => {
        this.log(record.prettyPrint());
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

  public setBreakpoints(
    fileName: string,
    breakpoints: DebugProtocol.SourceBreakpoint[]
  ): Promise<Breakpoint[]> {
    return new Promise(resolve => {
      // If this is the first time setting a breakpoit in this file, initialize
      // our breakpoints array to countain no previously requested breakpoints
      if (!this.breakpoints.has(fileName)) {
        this.breakpoints.set(fileName, []);
      }

      fileName = this.getNormalizedFileName(fileName);
      const breakpointsPending: Promise<void>[] = [];
      const breakpointsConfirmed: Breakpoint[] = [];

      // Send each breakpoint to GDB. As GDB replies with acknowledgements of
      // the breakpoint being set, if the breakpoint has been bound to a source
      // location, mark the breakpoint as being verified. Further, irregardless
      // of whether or not a breakpoint has been bound to source, modify break
      // conditions if/when applicable. Note that since we issue commands sequentially
      // and the debugger will resolve commands in order, we fulfill the requirement
      // that breakpoints be returned in the same order requested
      breakpoints.forEach(breakpoint => {
        const breakpointCommand = `-break-insert -f ${fileName}:${breakpoint.line}`;
        breakpointsPending.push(
          this.sendCommand(breakpointCommand).then(
            (breakpoint: OutputRecord) => {
              const bkpt = breakpoint.getResult('bkpt');
              breakpointsConfirmed.push(
                new Breakpoint(!bkpt.pending, bkpt.line)
              );
            }
          )
        );
      });

      Promise.all(breakpointsPending).then(() => {
        // Only return breakpoints GDB has actually bound to a source. Others
        // will be marked verified as the debugger binds them later on
        resolve(breakpointsConfirmed);
      });
    });
  }

  public stepIn(threadID: number): Promise<OutputRecord> {
    return this.sendCommand(`-exec-step --thread ${threadID}`);
  }

  public stepOut(threadID: number): Promise<OutputRecord> {
    return this.sendCommand(`-exec-finish --thread ${threadID}`);
  }

  public startInferior(): Promise<any> {
    throw new Error('Method not implemented.');
  }

  public terminate(): Promise<any> {
    throw new Error('Method not implemented.');
  }

  protected createDebuggerLaunchCommand(): string {
    // This idea is borrowed from the Microsoft cpptools VSCode extension.
    // It really is the only conceivable way to support running in the
    // integrated terminal. We spin on the GDB process to prevent the shell
    // from accepting normal commands. We set a trap handler to correctly
    // communicate inferior completion back to the debug adapter so we can
    // issue the corresponding TerminatedEvent and take down GDB. We issue
    // the +m command to hide the background "done" message when GDB
    // finishes debugging the inferior. These hacks probably won't work on Windows

    // Append any user specified arguments to the inferior
    if (typeof this.inferiorProgram === 'string') {
      if (this.userSpecifiedDebuggerArguments) {
        this.debuggerLaunchArguments.push('--args');
        this.debuggerLaunchArguments.push(this.inferiorProgram);
        this.debuggerLaunchArguments = this.debuggerLaunchArguments.concat(
          this.userSpecifiedDebuggerArguments
        );
      } else {
        this.debuggerLaunchArguments.push(this.inferiorProgram);
        this.debuggerLaunchArguments = this.debuggerLaunchArguments.reverse();
      }
    }

    return `bash -c "${this.createEnvironmentVariablesSetterCommand()} trap '' 2 ; ${
      this.debuggerPath
    } ${this.debuggerLaunchArguments.join(' ')} < ${
      this.inferiorInputFileName
    } > ${
      this.inferiorOutputFileName
    } & clear ; pid=$!; set +m ; wait $pid ; trap 2 ; echo ;"`;
  }

  protected handlePostDebuggerStartup(): Promise<boolean> {
    return new Promise(resolve => {
      resolve(true);
    });
  }

  private createEnvironmentVariablesSetterCommand(): string {
    let bashCommand = '';

    Object.keys(this.environmentVariables).forEach((key: string) => {
      const value = this.environmentVariables[key];
      bashCommand = bashCommand.concat(`export ${key}=${value};`, bashCommand);
    });

    return bashCommand;
  }

  private clearDebuggerVariables(): Promise<boolean> {
    return new Promise(resolve => {
      if (this.variables.size) {
        this.sendCommand('-var-delete').then(() => {
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
}
