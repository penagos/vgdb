import {OutputRecord} from './OutputRecord';
import {AsyncRecord} from './AsyncRecord';
import {StreamRecord} from './StreamRecord';
import {Result} from './Result';
import {ResultRecord} from './ResultRecord';
import { OutOfBandRecord } from './OutOfBandRecord';

// MI grammar based on https://ftp.gnu.org/old-gnu/Manuals/gdb/html_chapter/gdb_22.html
// First sets below -- Regex exprs defined with `` need to escape \ char
const VARIABLE = /^([a-zA-Z_][a-zA-Z0-9_\-]*)/;
const TOKEN = '\\d*';
const ASYNC_RECORD = '[\\*\\+\\=]';
const STREAM_RECORD = '[\\~\\@\\&]';
const CSTRING = /^\"((\\.|[^"])*)\"/;
const OUT_OF_BAND_RECORD = new RegExp(
  `^(?:(${TOKEN})(${ASYNC_RECORD})|(${STREAM_RECORD}))`
);
const RESULT_RECORD = new RegExp(
  `^(${TOKEN})\\^(done|running|connected|error|exit)`
);
const ASYNC_CLASS = /^([_a-zA-Z0-9\-]*)/;
const GDB_PROMPT = '(gdb)';

export const STOPPED = 'stopped';
export const RUNNING = 'running';
export const ERROR = 'error';

const VALUE_CSTRING = '"';
const VALUE_TUPLE = '{';
const VALUE_LIST = '[';

// Relative ordering of records in an OUT_OF_BAND_RECORD regexp
const TOKEN_POS = 1;
const ASYNC_RECORD_POS = 2;
const STREAM_RECORD_POS = 3;

export class MIParser {
  private buffer: string = '';
  private token: number = 0;

  public parse(str: string): OutputRecord | null {
    let record: OutputRecord | null;
    this.buffer = str;

    try {
      // ( out-of-band-record )* [ result-record ] "(gdb)" nl
      record = this.parseOutOfBandRecord()
        || this.parseResultRecord()
        || this.parseGDBPrompt();

        if (record) {
          record.response = str;
        }
    } catch (error: any) {
      console.error(`Parser error: ${error.message}`);
      throw error;
    }

    return record;
  }

  private parseToken(match: any[]): number {
    if (match[TOKEN_POS] !== '') {
      this.token = parseInt(match[TOKEN_POS]);
    } else {
      this.token = NaN;
    }

    return this.token;
  }

  private parseGDBPrompt(): null {
    if (this.buffer.trimRight() !== GDB_PROMPT) {
      new Error('Unexpected GDB symbol found in output.');
    }

    return null;
  }

  private parseOutOfBandRecord(): OutOfBandRecord | null {
    // async-record | stream-record
    let match: any[] | null;

    if ((match = OUT_OF_BAND_RECORD.exec(this.buffer))) {
      this.parseToken(match);

      if (match[ASYNC_RECORD_POS]) {
        return this.parseAsyncRecord();
      } else if (match[STREAM_RECORD_POS]) {
        return this.parseStreamRecord();
      } else {
        throw new Error('Expected to find AsyncRecord or StreamRecord');
      }
    } else return null;
  }

  private parseAsyncRecord(): AsyncRecord {
    // exec-async-output | status-async-output | notify-async-output
    // First character denotes result class
    let match: any, result: any;
    const record = new AsyncRecord(this.token);
    record.setType(this.buffer[0]);

    this.buffer = this.buffer.substring(this.buffer[0].length);
    if ((match = ASYNC_CLASS.exec(this.buffer))) {
      // async-output ==> async-class ( "," result )* nl
      record.setClass(match[1]);
      this.buffer = this.buffer.substring(match[0].length);

      while (this.buffer[0] === ',') {
        // Consume , and read result
        this.buffer = this.buffer.substr(1);

        if ((result = this.parseResult())) {
          record.addResult(result);
        }
      }
    } else {
      throw new Error('Failed to parse AsyncRecord');
    }

    return record;
  }

  private parseStreamRecord(): StreamRecord {
    return new StreamRecord(this.token, this.buffer[1]);
  }

  private parseResultRecord(): ResultRecord | null {
    // [ token ] "^" result-class ( "," result )* nl
    let match: any, record: any;

    if ((match = RESULT_RECORD.exec(this.buffer))) {
      record = new ResultRecord(this.parseToken(match));
      record.setClass(match[2]);

      // Consume first part of match, parse results*
      this.buffer = this.buffer.substring(match[0].length);

      while (this.buffer[0] === ',') {
        // Consume , and read result
        this.buffer = this.buffer.substr(1);
        const result = this.parseResult();
        if (result) {
          record.addResult(result);
        }
      }

      return record;
    } else {
      return null;
    }
  }

  private parseResult(): any[] | null {
    let match: any[] | null;

    if ((match = VARIABLE.exec(this.buffer))) {
      // Also consume '='
      this.buffer = this.buffer.substring(match[0].length + 1);
      return [match[1], this.parseValue()];
    } else {
      return null;
    }
  }

  private parseValue(): any {
    // value ==> const | tuple | list
    switch (this.buffer[0]) {
      case VALUE_CSTRING:
        return this.parseCString();

      case VALUE_TUPLE:
        return this.parseTuple();

      case VALUE_LIST:
        return this.parseList();

      default:
        return null;
    }
  }

  private parseCString(): string {
    let match: string[] | null;

    if ((match = CSTRING.exec(this.buffer))) {
      // Consume corresponding '"'
      this.buffer = this.buffer.substring(match[0].length);
      return match[1];
    } else {
      throw new Error('could not parse cstring: ' + this.buffer);
    }
  }

  private parseTuple(): Result[] {
    // tuple ==> "{}" | "{" result ( "," result )* "}"
    let result: any[] | null;
    const tuple = <any>{};

    do {
      // Skip over , or {
      this.buffer = this.buffer.substring(1);
      if ((result = this.parseResult())) {
        tuple[result[0]] = result[1];
      }
    } while (this.buffer[0] === ',');

    // Conbsume last }
    this.buffer = this.buffer.substring(1);

    return tuple;
  }

  private parseList(): any[] {
    // list ==> "[]" | "[" value ( "," value )* "]" | "[" result ( "," result )* "]"
    let match: any[] | null;
    const list: any = [];

    // Consume first [
    this.buffer = this.buffer.substring(1);

    // Is this a list of values or list of results?
    if (
      [VALUE_CSTRING, VALUE_LIST, VALUE_TUPLE].indexOf(this.buffer[0]) !== -1
    ) {
      // Value list
      while ((match = this.parseValue())) {
        this.buffer = this.buffer.substring(1);
        list.push(match);
      }
    } else {
      // Result list
      while ((match = this.parseResult())) {
        this.buffer = this.buffer.substring(1);
        list.push(match);
      }
    }

    // If empty list, eat analogous ]
    if (!list.length) {
      this.buffer = this.buffer.substring(1);
    }

    return list;
  }
}
