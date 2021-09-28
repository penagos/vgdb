import { OutOfBandRecord } from './OutOfBandRecord';

enum StreamRecordType {
  CONSOLE = '~',
  TARGET = '@',
  LOG = '&'
}

export class StreamRecord extends OutOfBandRecord {
  protected type?: StreamRecordType;
  private cString: string;

  constructor(token: number, cString: string) {
    super(token);
    this.cString = cString;
  }

  public getCString(): string {
    return this.cString;
  }
}
