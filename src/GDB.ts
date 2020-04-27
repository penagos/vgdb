export class GDB {
    public constructor() {
        // Spawn GDB process
        console.log("starting GDB");
    }

    public spawn(program: string): Promise<any> {
        return new Promise
            ((resolve, reject) => {

            });
    }
}