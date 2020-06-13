# vGDB | Visual Studio Code Debug Adapter

A native typescript implementation of a debug adapter for GDB for use in Visual Studio Code. Tested on Linux, Windows support is untested. **This extension is under active development**

## Features

- Debugging on Linux (Windows and Mac support untested)
- Launch target in integrated Visual Studio Code terminal or external terminal
- Conditional breakpoints
- Debug Console prompt accepts native GDB commands
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

| Configuration Option  | Description                                                              |
| --------------------- |--------------------------------------------------------------------------|
| `args`                | Array of arguments to pass to debuggee                                   |
| `cwd`                 | The directory in which to start GDB                                      |
| `debug`               | Enable debug logging of the adapter (under vGDB output tab)              |
| `debugger`            | (Optional) path to GDB executable                                        |
| `env`                 | Key value pairs of environment variables to set in debugging shell       |
| `externalConsole`     | If set to false, debuggee will launch in Visual Studio Code terminal     |
| `program`             | Path to program to debug                                                 |
| `sharedLibraries`     | Array of shared library names to load, disregards all other libraries    |
| `startupCmds`         | Array of GDB commands to run at start                                    |


### Attach Requests

| Configuration Option  | Description                                                              |
| --------------------- |--------------------------------------------------------------------------|
| `debug`               | Enable debug logging of the adapter (under vGDB output tab)              |
| `debugger`            | (Optional) path to GDB executable                                        |
| `program`             | Path to program to debug                                                 |