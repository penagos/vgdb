/**
 * Implements a GDBMI output record. This is the start symbol for any GDB output
 * This class is not intended to be directly instantiable. Instead, see:
 * ResultRecord, StreamRecord and OutOfBandRecord
 */
export abstract class OutputRecord {
  public response: string = '';
  protected readonly token: number;
  protected abstract type?: any;
  protected results: Map<string, any>;
  private klass?: string;

  public constructor(token: number) {
    this.token = token;
    this.results = new Map();
  }

  public getToken() {
    return this.token;
  }

  public setType(type: any) {
    this.type = type;
  }

  public getType() {
    return this.type;
  }

  public setClass(klass: string) {
    this.klass = klass;
  }

  public getClass() {
    return this.klass;
  }

  public addResult(result: any) {
    this.results.set(result[0], result[1]);
  }

  public getResult(key: string): any {
    return this.results.get(key);
  }

  public prettyPrint(): string {
    return this.response;
  }
}
