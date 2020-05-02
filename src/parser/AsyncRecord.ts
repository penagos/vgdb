import { Record } from "./Record";

export enum AsyncRecordType {
    EXEC = '*',
    STATUS = '+',
    NOTIFY = '='
}

export class AsyncRecord extends Record {
    protected type: AsyncRecordType;
    private results: Map<string, any>;

    public constructor(token: number) {
        super(token);   
        this.results = new Map();
    }

    public addResult(result) {
        this.results[result[0]] = result[1];
    }
};