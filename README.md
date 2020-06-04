# vGDB | Visual Studio Code Debug Adapter

A native typescript implementation of a debug adapter for GDB for use in Visual Studio Code. Tested on Linux, Windows support is untested.

## Features

- Debugging on Linux (Windows and Mac support untested)
- Supports integrated Visual Studio Code terminal
- Debug Console prompt accepts native GDB commands
- Honors deferred symbol loading settings in `.gdbinit`
- Supports attach requests
- Supports remoteSSH

## Quick Start

vGDB ships with a sample launch configuration snippet you can use to quickly get started. Assuming your executable is named `a.out`, getting started is as easy as:

![EZ Setup](resources/ezsetup.gif)

There is also a snippet for an attach request.

## Configuration

