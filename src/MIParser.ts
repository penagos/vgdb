import { GDB } from "./GDB";

// First sets below -- Regex exprs defined with `` need to escape \ char
const VARIABLE = /^([a-zA-Z_][a-zA-Z0-9_\-]*)/;
const TOKEN = `\\d*`;
const ASYNC_RECORD = `[\\*\\+\\=]`;
const STREAM_RECORD = `[\\~\\@\\&]`;
const OUT_OF_BAND_RECORD = new RegExp(`^(?:(${TOKEN})(${ASYNC_RECORD})|(${STREAM_RECORD}))`);
const RESULT_RECORD = new RegExp(`^${TOKEN}\^(done|running|connected|error|exit)`);
const ASYNC_CLASS = /^([_a-zA-Z0-9\-]*)/;

// Relative ordering of records in an OUT_OF_BAND_RECORD regexp
const TOKEN_POS = 1;
const ASYNC_RECORD_POS = 2;
const STREAM_RECORD_POS = 3;

abstract class Record {
    public token: number;
    public abstract type: any;
    public klass: string;

    public constructor(token: number) {
        this.token = token;
    }

    public setType(type: any) {
        this.type = type;
    }

    public setKlass(klass: string) {
        this.klass = klass;
    }
};

class Result {
    public variable: string;
    public value: any;

    public constructor(name: string, value: any) {
        this.variable = name;
        this.value = value;
    }
};

enum AsyncRecordType {
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

enum StreamRecordType {
    CONSOLE = '~',
    TARGET = '@',
    LOG = '&'
}

export class StreamRecord extends Record {
    public type: StreamRecordType;
};

export class MIParser {
    //private gdb: GDB;
    private buffer: string;
    private token: number;

    public constructor(gdb: GDB) {
        //this.gdb = gdb;
    }

    // Called whenever parser enters invalid state -- will immediately terminate
    private error(msg: string) {
        console.error(msg);
        process.exit(1);
    }

    public parse(str: string) {
        // MI grammar based on https://ftp.gnu.org/old-gnu/Manuals/gdb/html_chapter/gdb_22.html
        let record;
        this.buffer = str;
        console.log("(stdout) " + this.buffer);

        try {
            // ( out-of-band-record )* [ result-record ] "(gdb)" nl
            record = this.parseOutOfBandRecord();

            if (!record) {
                record = this.parseResultRecord();
            }
        } catch(error) {
            this.error("Parser error: " + error.message);
        }

        return record;
    }

    private parseOutOfBandRecord() : Record {
        // async-record | stream-record
        let match;

        if (match = OUT_OF_BAND_RECORD.exec(this.buffer)) {
            this.buffer = this.buffer.substring(match[0].length);
            this.token = parseInt(match[TOKEN_POS]);

            if (match[ASYNC_RECORD_POS]) {
                return this.parseAsyncRecord();
            } else if (match[STREAM_RECORD_POS]) {
                return this.parseStreamRecord();
            } else {
                throw new Error("Expected to find AsyncRecord or StreamRecord");
            }
        } else {
            throw new Error("Failed to parse OutOfBandRecord");
        }
    }


    private parseAsyncRecord() {
        // exec-async-output | status-async-output | notify-async-output
        // First character denotes result class
        let record = new AsyncRecord(this.token);
        record.setType(AsyncRecordType[this.buffer[0]]);

        // Should always match
        if (ASYNC_CLASS.exec(this.buffer)) {
            // async-output ==> async-class ( "," result )* nl
            while (this.buffer[0] == ',') {
                // Consume , and read result
                this.buffer = this.buffer.substr(1);
                let result = this.parseResult();

                if (result) {
                    record.addResult(result);
                }
            }
        } else {
            throw new Error("Failed to parse AsyncRecord");
        }

        return record;
    }

    private parseStreamRecord() {
        // TODO
        return new StreamRecord(1);
    }

    private parseResultRecord() {
        // [ token ] "^" result-class ( "," result )* nl
        let match;

        if (match = RESULT_RECORD.exec(this.buffer)) {
            console.log(match);
        } else {
            throw new Error("Failed to parse resultRecord");
        }
    }

    private parseResult() : Result {
        let match;

        if (match = VARIABLE.exec(this.buffer)) {
            // Also consume '='
            this.buffer = this.buffer.substring(match[0].length + 1);
            return new Result(match[1], this.parseValue());
        } else {
            throw new Error("Failed to parse result");
        }
    }

    private parseValue() : any {
        return null;
    }
}