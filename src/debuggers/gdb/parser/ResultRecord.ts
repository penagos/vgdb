import {OutputRecord} from './OutputRecord';

export enum ResultRecordType {
  DONE = 'done',
  RUNNING = 'running',
  CONNECTED = 'connected',
  ERROR = 'error',
  EXIT = 'exit',
}

export class ResultRecord extends OutputRecord {
  protected type?: ResultRecordType;
}
