import { OutOfBandRecord } from './OutOfBandRecord';

/**
 * Implements GDB async record. Used to notify client of any changes that may
 * have occurred as a result of target activity (such as the inferior stopping),
 * or pertaining to previously issued commands (such as binding a breakpoint
 * to a source location)
 */
export enum AsyncRecordType {
  EXEC = '*',
  STATUS = '+',
  NOTIFY = '='
}

export class AsyncRecord extends OutOfBandRecord {
  protected type?: AsyncRecordType;
}
