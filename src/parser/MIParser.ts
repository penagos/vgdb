import { AsyncRecord } from "./AsyncRecord";
import { StreamRecord } from "./StreamRecord";

// MI grammar based on https://ftp.gnu.org/old-gnu/Manuals/gdb/html_chapter/gdb_22.html
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

const NO_TOKEN = -1;

export class MIParser {
    private buffer: string;
    private token: number;

    public parse(str: string) {
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
        let record = new AsyncRecord(this.token);
        record.setType(this.buffer[0]);

        this.buffer = this.buffer.substring(this.buffer[0].length);
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