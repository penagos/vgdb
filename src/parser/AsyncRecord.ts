import { Record } from "./Record";
import { Result } from "./Result";

export enum AsyncRecordType {
    EXEC = '*',
    STATUS = '+',
    NOTIFY = '='
}

export class AsyncRecord extends Record {
    public type: AsyncRecordType;
    protected typeEnum = AsyncRecordType;
    public results: Result[];

    public constructor(token: number) {
        super(token);
        this.results = [];
    }

    public addResult(result: Result) {
        this.results.push(result);
    }
};