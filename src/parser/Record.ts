
export abstract class Record {
    protected token: number;
    protected abstract type: any;
    protected abstract typeEnum: any;
    private klass: string;

    public constructor(token: number) {
        this.token = token;
    }

    public getToken() {
        return this.token;
    }

    public setType(type: any) {
        for (let item in this.typeEnum) {
            if (this.typeEnum[item] == type) {
                this.type = item;
                break;
            }
        }
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