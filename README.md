# GDB Debug Adapter for VSCode

A typescript implementation of a debug adapter for GDB for use in VSCode.

## Installation

Currently, to install the extension you will need to build from source (it is not public on the extension marketplace):

```bash
git clone https://github.com/penagos/vgdb
cd vgdb
npm install
vsce package
```
These commands will install all necessary build dependencies and package the extension into a VSIX file which you can install in VSCode (see https://code.visualstudio.com/docs/editor/extension-gallery)


