import { Record } from "./Record";

enum StreamRecordType {
    CONSOLE = '~',
    TARGET = '@',
    LOG = '&'
}

export class StreamRecord extends Record {
    protected type: StreamRecordType;
    protected typeEnum = StreamRecordType;
};