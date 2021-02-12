import * as exps from './expressions';
import * as rt from './rt';
export declare class Assembler {
    readonly nonOptimizedTextCode: string;
    readonly nonOptimizedBinaryCode: Uint8Array;
    readonly textCode: string;
    readonly binaryCode: Uint8Array;
    constructor(expressions: exps.Expression[]);
    private newModule;
    private organizeMemory;
    private declareStartFunction;
    private declareCycleFunction;
    private declareExpressionFunctions;
    private validate;
    exports<E extends WebAssembly.Exports>(rtModules: rt.RuntimeModules): E;
}
//# sourceMappingURL=assembler.d.ts.map