
export abstract class Record {
    protected token: number;
    protected abstract type: any;
    private klass: string;

    public constructor(token: number) {
        this.token = token;
    }

    public getToken() {
        return this.token;
    }

    public setType(type: any) {
        this.type = type;
    }

    public getType() {
        return this.type;
    }

    public setClass(klass: string) {
        this.klass = klass;
    }

    public getClass() {
        return this.klass;
    }
};