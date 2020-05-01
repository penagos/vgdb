import { Record } from "./Record";

export enum AsyncRecordType {
    EXEC = '*',
    STATUS = '+',
    NOTIFY = '='
}

export class AsyncRecord extends Record {
    public type: AsyncRecordType;
    public results: Result[];

    public addResult(result: Result) {
        this.results.push(result);
    }
};