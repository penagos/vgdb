export class Result {
    public variable: string;
    public value: any;

    public constructor(name: string, value: any) {
        this.variable = name;
        this.value = value;
    }
};