import { Record } from "./Record";

export enum ResultRecordType {
    DONE = "done",
    RUNNING = "running",
    CONNECTED = "connected",
    ERROR = "error",
    EXIT = "exit"
}

export class ResultRecord extends Record {
    protected type: ResultRecordType;
    protected typeEnum = ResultRecordType;
    private results: Map<string, any>;

    public constructor(token: number) {
        super(token);
        this.results = new Map();
    }

    public addResult(result) {
        // We store entries in a map instead for fast, hashed access
        this.results[result[0]] = result[1];
    }

    public getResult(key: string) {
        return this.results[key];
    }
};