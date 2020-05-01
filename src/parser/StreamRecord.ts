import { Record } from "./Record";

enum StreamRecordType {
    CONSOLE = '~',
    TARGET = '@',
    LOG = '&'
}

export class StreamRecord extends Record {
    public type: StreamRecordType;
};