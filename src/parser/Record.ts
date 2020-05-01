
export abstract class Record {
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