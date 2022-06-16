# Release Notes
**This extension is under active development**

## 1.3.0 (July/1/2022)

This release adds the following features:

- `debuggerArgs` launch configuration setting: pass arbitrary arguments to the debugger extension (Fixes #20)
- Improve verbose debugging output by including commands sent to MI debugger

This release fixes the following bugs:

- Invalid / unavailable watch expressions are now correctly rendered in the UI in lieu of showing old previously available value
- Stack frames with unavailable debug symbols are shown as grayed out to better convey lack of source
- Fix failed debug launches with VSCode 1.68.0+ by reworking how the integrated terminal is used to spawn the MI debugger
- Fix log breakpoints always resuming inferior execution (not honoring step requests)
## 1.2.0 (December/16/2021)

This release adds the following features:

- Setting function breakpoints
- Breaking on C++ throws/catches
- Setting logpoints

This release fixes the following bugs:

- Values not being properly set in the variables pane
- Fix verbose debugging option
- Other minor stability improvements

## 1.1.1 (November/9/2021)

This release fixes the following bug:

- Breakpoints sporadically binding to the inferior process
## 1.1.0 (November/7/2021)

This release fixes the following bugs:

- Sporadic launch issues when attaching/spawning processes (#14)
- Correctly load sharedlibrary debug symbols when attaching to multi-threaded programs

## 1.0.0 (September/30/2021)

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
- Support hit counts in conditional breakpoints
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