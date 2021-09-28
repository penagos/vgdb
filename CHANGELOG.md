# Release Notes
**This extension is under active development**

## 1.0.0 (TBD)

This release includes numerous bug fixes and additional features as outlined below:

- Support variable watches
- Support debug console command completion
- Support disassembly view
- Show registers in variables pane
- Correctly escape debug console commands containing `"`
- Correctly handle debugger exceptions
- Correctly handle environment variables
- Correctly handle deferred symbol loading
- Correctly handle aggregate variables in watch pane, variables pane and mouse hovers
- Support (optional) MI command syntax in debug console
- Upgrade dependencies
- Refactor debugger interface for faster performance
- Other minor bug fixes and stability improvements

## 0.1.27 (July/23/2020)

### Enhancements
- Expose new configuration setting `vgdb.showErrorPopup` to toggle displaying error message popup windows on invalid GDB commands in response to #2. Default value is `false`.

## 0.1.26 (June/15/2020)

### Enhancements
- Added new config option `useAbsoluteFilePaths` for toggling how breakpoints are set
- Change debug logging level to be more finegrained: `off`, `basic` or `verbose`

### Fixed
- Variables are now updated when modified from `Variables` pane in Visual Studio Code

## 0.1.25 (June/12/2020)

### Enhancements
- Support for external terminal
- Support for deferred shared library loading
- Faster disconnect request

## 0.1.24 (June/9/2020)

### Enhancements
- Support for GDB setupCmds in launch configurations
- Support for environment variables in launch configurations

### Fixed
- Sending debug commands while inferior was running invalidated call stack
- Stop button works on first click
- Variables pane not updating on stack frame changes

## 0.1.23 (June/6/2020)

### Fixed
- GDB now killed on exiting a debug session
- Attached-to processes are not killed anymore on GDB detach
- Reuse same output channel and terminal across multiple debug sessions

## 0.1.22 (June/3/2020)

### Enhancements
- Removed frame address from stack

### Fixed
- Pause request not responding
- Multiple threads now shown on running processes
- Attach request fixed to accept pause requests

## 0.1.21 (June/2/2020)

### Fixed
- Debug console output not properly stripping special characters
- Breakpoints not being able to be removed
- Other minor improvements