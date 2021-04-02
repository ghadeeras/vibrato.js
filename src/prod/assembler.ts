import * as types from './datatypes' 
import * as exps from './expressions'
import * as wa from './wa';
import * as rt from './rt';

import binaryen from 'binaryen'

export class Assembler {

    readonly binaryCode: Uint8Array
    readonly textCode: string;
    
    constructor(expressions: exps.Expression[]) {
        const flatExpressions: exps.Expression[] = flatten(expressions)
        const module = new binaryen.Module();
        const memoryAllocator = new StaticMemoryAllocatorImpl(module)

        rt.addImportsToModule(module)
        
        for (let value of flatExpressions) {
            value.memory(memoryAllocator)
        }
        memoryAllocator.allocate(8, charCodesOf("STACK..."))
        module.setMemory(1, 65536, "stack", memoryAllocator.memorySegments)
        module.setStart(module.addFunction("init", binaryen.createType([]), binaryen.none, [],
            module.drop(module.call("allocate8", [module.i32.const(memoryAllocator.stackOffset)], binaryen.i32))
        ))

        for (let value of flatExpressions) {
            value.functions(module)
            const exports = value.exports();
            for (let k in exports) {
                module.addFunctionExport(exports[k], k)
            }
        }

        if (!module.validate()) {
            throw new Error("Web Assembly module validation failed!")
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

class StaticMemoryAllocatorImpl implements exps.StaticMemoryAllocator {

    private offset: number = 0
    readonly segments: binaryen.MemorySegment[] = []

    constructor(readonly module: binaryen.Module) {
    }
    
    declare<A extends types.NumberArray>(vector: types.Vector<A>, initialValue: number[]): number {
        return this.allocate<A>(
            vector.componentType.sizeInBytes, 
            vector.buffer(initialValue)
        );
    }

    allocate<A extends types.NumberArray>(wordSize: types.PrimitiveSize<A>, array: ArrayBufferLike | ArrayLike<number>) {
        const alignment = (wordSize - this.offset % wordSize) % wordSize;
        const result = this.offset + alignment;

        const segment: binaryen.MemorySegment = {
            data: new Uint8Array(array),
            offset: this.module.i32.const(result),
            passive: false
        };

        this.segments.push(segment);
        this.offset = result + segment.data.length;
        return result;
    }

    get stackOffset() {
        return this.offset
    }

    get memorySegments() {
        return this.segments
    }
    
}

function charCodesOf(stackMarker: string) {
    const stackMarkerArray: number[] = [];
    for (let i = 0; i < stackMarker.length; i++) {
        stackMarkerArray.push(stackMarker.charCodeAt(i));
    }
    return stackMarkerArray;
}

function flatten(expressions: exps.Expression[]): exps.Expression[] {

    function visit(expression: exps.Expression, visited: Set<exps.Expression>) {
        if (!visited.has(expression)) {
            visited.add(expression)
            for (let exp of expression.subExpressions()) {
                visit(exp, visited)
            }
        }
    }

    const result = new Set<exps.Expression>()
    for (let exp of expressions) {
        visit(exp, result)
    }

    return [...result]
}
