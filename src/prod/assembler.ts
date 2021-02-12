import * as types from './datatypes' 
import * as exps from './expressions'
import * as wa from './wa';
import * as rt from './rt';

import binaryen from 'binaryen'

export class Assembler {

    readonly binaryCode: Uint8Array
    readonly textCode: string;
    
    constructor(values: exps.Value<types.NumberArray, number>[]) {
        const module = new binaryen.Module();

        rt.addImportsToModule(module)
        
        for (let value of values) {
            value.declarations(module)
            const exports = value.exports();
            for (let k in exports) {
                module.addFunctionExport(exports[k], k)
            }
        }

        module.optimize();
        this.textCode = module.emitText();
        this.binaryCode = module.emitBinary();
        module.dispose();
    }

    exports<E extends WebAssembly.Exports>(rtModules: rt.RuntimeModules): E {
        return wa.instantiate<E>(this.binaryCode.buffer, rtModules)
    }

}
