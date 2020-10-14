import * as vscode from 'vscode';
import * as vstest from 'vscode-test';
import {MIParser} from '../../src/parser/MIParser';

suite('MI Parser', () => {
  test('Out of Band Record', () => {
    const parser = new MIParser();
    const record = parser.parse('blah');
    console.log('todo');
  });

  test('Result Record', () => {
    console.log('todo');
  });

  test('Async Record', () => {
    console.log('todo');
  });

  test('Stream Record', () => {
    console.log('todo');
  });
});
