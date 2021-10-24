import * as types from './datatypes.js'
import * as exps from './expressions.js'
import * as wa from './wa.js'
import * as rt from './rt-node.js'

import binaryen from 'binaryen'

export class Assembler {

    readonly nonOptimizedTextCode: string;
    readonly nonOptimizedBinaryCode: Uint8Array;
    readonly textCode: string;
    readonly binaryCode: Uint8Array
    
    constructor(expressions: exps.Expression[]) {
        const allExpressions: exps.Expression[] = flatten(expressions)
        const module = this.newModule();
        try {
            const stackOffset = this.organizeMemory(module, allExpressions);
            this.declareStartFunction(module, stackOffset);
            this.declareCycleFunction(module, allExpressions);
            this.declareExpressionFunctions(module, allExpressions);
    
            this.validate(module);
            this.nonOptimizedTextCode = module.emitText()
            this.nonOptimizedBinaryCode = module.emitBinary();
    
            module.optimize();
            this.textCode = module.emitText();
            this.binaryCode = module.emitBinary();
            
            console.log(`Final code: \n${this.textCode}`)
        } catch (e) {
            console.log(e)
            console.log(`Bad code: \n${module.emitText()}`)
            throw e
        } finally {
            module.dispose();
        }
    }

    private newModule() {
        const module = new binaryen.Module();
        module.setFeatures(module.getFeatures() | binaryen.Features.BulkMemory);
        rt.addImportsToModule(module)
        return module;
    }

    private organizeMemory(module: binaryen.Module, expressions: exps.Expression[]) {
        const memoryAllocator = new StaticMemoryAllocatorImpl(module);

        for (let value of expressions) {
            value.memory(memoryAllocator);
        }
        memoryAllocator.allocate(8, charCodesOf("STACK..."));

        const stackOffset = memoryAllocator.stackOffset;
        const minPages = (stackOffset + 0xFFFF) / 0x10000;
        module.setMemory(minPages, 65536, "stack", memoryAllocator.memorySegments);
        return stackOffset;
    }

    private declareStartFunction(module: binaryen.Module, stackOffset: number) {
        module.setStart(module.addFunction("init", binaryen.createType([]), binaryen.none, [],
            module.drop(module.call("allocate8", [module.i32.const(stackOffset)], binaryen.i32))
        ));
    }

    private declareCycleFunction(module: binaryen.Module, expressions: exps.Expression[]) {
        const exps: binaryen.ExpressionRef[] = [];
        exps.push(module.call("enter", [], binaryen.none));
        for (let value of expressions) {
            exps.push(...value.read(module));
        }
        for (let value of expressions) {
            exps.push(...value.write(module));
        }
        exps.push(module.call("leave", [], binaryen.none));
        module.addFunction(
            "cycle",
            binaryen.createType([]),
            binaryen.none,
            [],
            module.block("cycle_block", exps, binaryen.none)
        );
        module.addFunctionExport("cycle", "cycle");
    }

    private declareExpressionFunctions(module: binaryen.Module, expressions: exps.Expression[]) {
        for (let value of expressions) {
            value.functions(module);
            const exports = value.exports();
            for (let k in exports) {
                module.addFunctionExport(exports[k], k);
            }
        }
    }

    private validate(module: binaryen.Module) {
        if (!module.validate()) {
            throw new Error("Web Assembly module validation failed!");
        }
    }

    exports<E extends WebAssembly.Exports>(rt: rt.Runtime): E {
        const linker = new wa.Linker({
            generated: new WebAssembly.Module(this.binaryCode.buffer)
        })
        return linker.link(rt.instances).generated.exports
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
