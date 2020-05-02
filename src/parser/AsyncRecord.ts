import { Record } from "./Record";

export enum AsyncRecordType {
    EXEC = '*',
    STATUS = '+',
    NOTIFY = '='
}

export class AsyncRecord extends Record {
    protected type: AsyncRecordType;

    public constructor(token: number) {
        super(token);   
    }
};