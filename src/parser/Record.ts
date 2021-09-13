export abstract class Record {
  public response: string = '';
  protected token: number;
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

  // Strip slashes, remove token identifier
  public prettyPrint(): string {
    //return this.response.substring(2, this.response.length - 1);
    return this.response;
  }
}
