import { Record } from "./Record";
import { Result } from "./Result";

export enum ResultRecordType {
    DONE = "done",
    RUNNING = "running",
    CONNECTED = "connected",
    ERROR = "error",
    EXIT = "exit"
}

export class ResultRecord extends Record {
    public type: ResultRecordType;
    protected typeEnum = ResultRecordType;
    public results: Result[];

    public constructor(token: number) {
        super(token);
        this.results = [];
    }

    public addResult(result: Result) {
        this.results.push(result);
    }
};