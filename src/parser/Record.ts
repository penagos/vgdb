
export abstract class Record {
    public token: number;
    public klass: string;
    public abstract type: any;
    protected abstract typeEnum: any;

    public constructor(token: number) {
        this.token = token;
    }

    public setType(type: any) {
        for (let item in this.typeEnum) {
            if (this.typeEnum[item] == type) {
                this.type = item;
                break;
            }
        }
    }

    public setKlass(klass: string) {
        this.klass = klass;
    }
};