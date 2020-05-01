import { GDB } from "./GDB";

// First sets below -- Regex exprs defined with `` need to escape \ char
const TOKEN = `\\d*`;
const ASYNC_RECORD = `[\\*\\+\\=]`;
const STREAM_RECORD = `[\\~\\@\\&]`;
const OUT_OF_BAND_RECORD = new RegExp(`^(?:(${TOKEN})(${ASYNC_RECORD})|(${STREAM_RECORD}))`);
const RESULT_RECORD = new RegExp(`^${TOKEN}\^(done|running|connected|error|exit)`);

// Relative ordering of records in an OUT_OF_BAND_RECORD regexp
const ASYNC_RECORD_POS = 2;


abstract class Record {
    public token: number;
    public abstract outputClass: any;

    public setClass(outputClass: any) {
        this.outputClass = outputClass;
    }
};

class Value {
    public value: any;
};

class Result {
    public variable: string;
    public value: Value;
};

enum AsyncRecordType {
    EXEC = '*',
    STATUS = '+',
    NOTIFY = '='
}

export class AsyncRecord extends Record {
    public outputClass: AsyncRecordType;
    public results: Result[];
};

enum StreamRecordType {
    CONSOLE = '~',
    TARGET = '@',
    LOG = '&'
}

export class StreamRecord extends Record {
    public outputClass: StreamRecordType;
};

export class MIParser {
    //private gdb: GDB;
    private buffer: string;

    public constructor(gdb: GDB) {
        //this.gdb = gdb;
    }

    public parse(str: string) {
        // MI grammar based on https://ftp.gnu.org/old-gnu/Manuals/gdb/html_chapter/gdb_22.html
        this.buffer = str;
        console.log("(stdout) " + this.buffer);

        // ( out-of-band-record )* [ result-record ] "(gdb)" nl
        let record = this.parseOutOfBandRecord();

        if (!record) {
            record = this.parseResultRecord();
        }

        return record;
    }

    private parseOutOfBandRecord() {
        // async-record | stream-record
        let match;

        if (match = OUT_OF_BAND_RECORD.exec(this.buffer)) {
            this.buffer = this.buffer.substring(match[0].length);

            if (match[ASYNC_RECORD_POS]) {
                return this.parseAsyncRecord();
            } else {
                // No need to match against STREAM_RECORD as match is implied
                return this.parseStreamRecord();
            }
        }

        return null;
    }


    private parseAsyncRecord() {
        // exec-async-output | status-async-output | notify-async-output
        // First character denotes result class
        let record = new AsyncRecord();
        record.setClass(AsyncRecordType[this.buffer[0]]);

        return record;
    }

    private parseStreamRecord() {

    }

    private parseResultRecord() {
        // [ token ] "^" result-class ( "," result )* nl
        let match;

        if (match = RESULT_RECORD.exec(this.buffer)) {
            console.log(match);
        }

        return null;
    }
}