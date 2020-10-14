import {Record} from './Record';

export enum ResultRecordType {
  DONE = 'done',
  RUNNING = 'running',
  CONNECTED = 'connected',
  ERROR = 'error',
  EXIT = 'exit',
}

export class ResultRecord extends Record {
  protected type: ResultRecordType;

  public constructor(token: number) {
    super(token);
  }
}
