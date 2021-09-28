# vGDB | Visual Studio Code GDB Debug Adapter

**v 0.1.0.0 os actively being developed and is slated for release in mid October with disassembly support, register support and numerous bug fixes**

A native typescript implementation of a debug adapter for GDB for use in Visual Studio Code. Tested on Linux, Windows support is untested. **This extension is under active development**

## Features

- Debugging on Linux (Windows and Mac support untested)
- Launch target in integrated Visual Studio Code terminal or external terminal
- Conditional breakpoints
- Debug Console prompt accepts native GDB commands
- Commands issued in the debug console will automatically pause and resume inferior process
- Honors deferred symbol loading settings in `.gdbinit`
- Support for lazy symbol loading as specified in launch configuration
- Support for setting environment variables
- Supports attach requests
- Supports remoteSSH

## Quick Start

vGDB ships with a sample launch configuration snippet you can use to quickly get started. Assuming your executable is named `a.out`, getting started is as easy as:

![EZ Setup](resources/ezsetup.gif)

There is also a snippet for an attach request.

## Configuration

These are all of the settings currently supported:

### Launch Requests

| Configuration Option  | Required | Description                                                              |
| --------------------- |----------|--------------------------------------------------------------------------|
| `args`                | No       | Array of arguments to pass to debuggee<br>```["arg1", "arg2", "arg3"]``` |
| `cwd`                 | No       | The directory in which to start GDB<br>```"someOptionalDirectory"```     |
| `debug`               | No       | Verbosity of logging.<br>```"off"\|"basic"\|"verbose"```                 |
| `debugger`            | No       | Path to GDB executable<br>```"/absolute/path/to/gdb"```                  |
| `env`                 | No       | Key value pairs of environment variables to set in debugging shell<br>```{"name1": "value1", "name2": "value2"}``` |
| `externalConsole`     | No       | If set to false, debuggee will launch in Visual Studio Code terminal<br>```true\|false``` |
| `program`             | Yes      | Path to program to debug<br>```"path/to/executable"```                   |
| `request`             | Yes      | Set this to `launch`                                                     |
| `sharedLibraries`     | No       | Array of shared library names to load, disregards all other libraries<br>```["solib1.so", "solib2.so"]``` |
| `startupCmds`         | No       | Array of GDB commands to run at start<br>```["gdb_command", "gdb_command2"]``` |
| `useAbsoluteFilePaths`| No       | If true (default), full filepaths will be used when setting breakpoints<br>```true\|false``` |


#### Additional Notes
- When using the `sharedLibraries` configuration setting, your `.gdbinit` setting for `auto-solib-add` will be overwritten to be `false`. The debug adapter will listen for shared library load events and only proceed to `sharedlibrary <name>` if that file is in your whitelist.
- When setting the `externalConsole` setting to `true`, hitting `CTRL+C` in the integrated terminal will not abort the debug target.
- The `startupCmds` commands will run after those in your `.gdbinit` file have run.
- Environment variables are available to both the debugger and inferior process

### Attach Requests

| Configuration Option  | Required | Description                                                              |
| --------------------- |----------|--------------------------------------------------------------------------|
| `debug`               | No       | Verbosity of logging. Values are `off`, `basic` or `verbose`             |
| `debugger`            | No       | Path to GDB executable                                                   |
| `program`             | Yes      | Path to program to debug                                                 |
| `request`             | Yes      | Set this to `attach`                                                     |
| `useAbsoluteFilePaths`| No       | If true (default), full filepaths will be used when setting breakpoints  |

### Building from Source

It's recommended that you use one of the published VSIX files on the releases tab, but you can also build the extension from source. To compile/package the extension yourself, you'll need to run the following commands:
```
npm install
npm run compile
vsce package
```

If you do not already have the `vsce` NodeJS CLI tool installed, please see https://code.visualstudio.com/api/working-with-extensions/publishing-extension
