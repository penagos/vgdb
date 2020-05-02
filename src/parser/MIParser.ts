import { Record } from "./Record";
import { AsyncRecord } from "./AsyncRecord";
import { StreamRecord } from "./StreamRecord";
import { Result } from "./Result";

// MI grammar based on https://ftp.gnu.org/old-gnu/Manuals/gdb/html_chapter/gdb_22.html
// First sets below -- Regex exprs defined with `` need to escape \ char
const VARIABLE = /^([a-zA-Z_][a-zA-Z0-9_\-]*)/;
const TOKEN = `\\d*`;
const ASYNC_RECORD = `[\\*\\+\\=]`;
const STREAM_RECORD = `[\\~\\@\\&]`;
const CSTRING = /^\"((\\.|[^"])*)\"/;
const OUT_OF_BAND_RECORD = new RegExp(`^(?:(${TOKEN})(${ASYNC_RECORD})|(${STREAM_RECORD}))`);
const RESULT_RECORD = new RegExp(`^${TOKEN}\^(done|running|connected|error|exit)`);
const ASYNC_CLASS = /^([_a-zA-Z0-9\-]*)/;

const VALUE_CSTRING = '"';
const VALUE_TUPLE = '{';
const VALUE_LIST = '[';

// Relative ordering of records in an OUT_OF_BAND_RECORD regexp
const TOKEN_POS = 1;
const CLASS_POS = 1;
const ASYNC_RECORD_POS = 2;
const STREAM_RECORD_POS = 3;

const NO_TOKEN = -1;

export class MIParser {
    private buffer: string;
    private token: number;

    public parse(str: string): Record {
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
            // Throw to adapter
            console.error("Parser error: " + error.message);
            throw error;
        }

        return record;
    }

    private parseOutOfBandRecord() {
        // async-record | stream-record
        let match;

        if (match = OUT_OF_BAND_RECORD.exec(this.buffer)) {
            // If no token precedes output, mark as -1
            if (match[TOKEN_POS] != "") {
                this.token = parseInt(match[TOKEN_POS]);
            } else {
                this.token = NO_TOKEN;
            }

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
        let match, result;
        let record = new AsyncRecord(this.token);
        record.setType(this.buffer[0]);

        this.buffer = this.buffer.substring(this.buffer[0].length);
        if (match = ASYNC_CLASS.exec(this.buffer)) {
            // async-output ==> async-class ( "," result )* nl
            record.setKlass(match[CLASS_POS]);
            this.buffer = this.buffer.substring(match[0].length);

            while (this.buffer[0] == ',') {
                // Consume , and read result
                this.buffer = this.buffer.substr(1);

                if (result = this.parseResult()) {
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
        // value ==> const | tuple | list
        switch(this.buffer[0]) {
            case VALUE_CSTRING:
                return this.parseCString();
            break;

            case VALUE_TUPLE:
                return this.parseTuple();
            break;

            case VALUE_LIST:
                return this.parseList();
            break;

            default:
                throw new Error("unexpected value token " + this.buffer[0]);
        }
    }

    private parseCString(): string {
        let match;

        if (match = CSTRING.exec(this.buffer)) {
            this.buffer = this.buffer.substring(match[0].length);
            return match[1];
        } else {
            throw new Error("could not parse cstring: " + this.buffer);
        }
    }

    private parseTuple(): Result[] {
        // tuple ==> "{}" | "{" result ( "," result )* "}"
        let result;
        let tuple:Result[] = [];

        do {
            // Skip over , or {
            this.buffer = this.buffer.substring(1);
            if (result = this.parseResult()) {
                tuple.push(result);
            }
        } while (this.buffer[0] == ',');

        // Conbsume last }
        this.buffer = this.buffer.substring(1);

        return tuple;
    }

    private parseList(): any[] {
        // list ==> "[]" | "[" value ( "," value )* "]" | "[" result ( "," result )* "]"
        let fHandle, match;
        let list:any[] = [];

        // Consume first [
        this.buffer = this.buffer.substring(1);

        // Is this a list of values or list of results?
        if ([VALUE_CSTRING, VALUE_LIST, VALUE_TUPLE].indexOf(this.buffer[0]) != -1) {
            // Value list
            fHandle = this.parseValue;
        } else {
            // Result list
            fHandle = this.parseResult;
        }

        while (match = fHandle()) {
            this.buffer = this.buffer.substring(1);
            list.push(match);
        }

        // Consume last ]
        this.buffer = this.buffer.substring(1);

        return list;
    }
}