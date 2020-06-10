# Release Notes
**This extension is under active development**

## 0.1.24 (June/9/2020)

### Enhancements
- Support for GDB setupCmds in launch configurations
- Support for environment variables in launch configurations

### Fixed
- Sending debug commands while inferior was running invalidated call stack
- Stop button works on first click

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