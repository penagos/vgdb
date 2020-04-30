import { GDB } from "./GDB";

const GDB_PROMPT = '(gdb)';

export class MIParser {
    private gdb: GDB;

    public constructor(gdb: GDB) {
        this.gdb = gdb;
    }

    public parse(str: string) {
        console.log("(stdout) " + str);

        if (this.gdb.isInitialized()) {

        } else {
            // Since we suppress the copyright and version headers on startup
            // we expect the initialization sequence to be complete when we
            // exactly OBTAIN (gdb)
            if (str == GDB_PROMPT) {
                this.gdb.setInitialized();
            } else {
                console.log("Failed initialization");
                process.exit(1);
            }
        }
    }
}