
export abstract class Record {
    public token: number;
    public abstract type: any;
    public klass: string;

    public constructor(token: number) {
        this.token = token;
    }

    public setType(type: any) {
        if (type === undefined) {
            throw new Error("Invalid record type");
        }

        this.type = type;
    }

    public setKlass(klass: string) {
        this.klass = klass;
    }
};