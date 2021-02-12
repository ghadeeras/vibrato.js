import * as wa from './wa.js';
import * as rt from './rt-node.js';
import binaryen from 'binaryen';
export class Assembler {
    constructor(expressions) {
        const allExpressions = flatten(expressions);
        const module = this.newModule();
        try {
            const stackOffset = this.organizeMemory(module, allExpressions);
            this.declareStartFunction(module, stackOffset);
            this.declareCycleFunction(module, allExpressions);
            this.declareExpressionFunctions(module, allExpressions);
            this.validate(module);
            this.nonOptimizedTextCode = module.emitText();
            this.nonOptimizedBinaryCode = module.emitBinary();
            module.optimize();
            this.textCode = module.emitText();
            this.binaryCode = module.emitBinary();
            console.log(`Final code: \n${this.textCode}`);
        }
        catch (e) {
            console.log(e);
            console.log(`Bad code: \n${module.emitText()}`);
            throw e;
        }
        finally {
            module.dispose();
        }
    }
    newModule() {
        const module = new binaryen.Module();
        module.setFeatures(module.getFeatures() | binaryen.Features.BulkMemory);
        rt.addImportsToModule(module);
        return module;
    }
    organizeMemory(module, expressions) {
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
    declareStartFunction(module, stackOffset) {
        module.setStart(module.addFunction("init", binaryen.createType([]), binaryen.none, [], module.drop(module.call("allocate8", [module.i32.const(stackOffset)], binaryen.i32))));
    }
    declareCycleFunction(module, expressions) {
        const exps = [];
        exps.push(module.call("enter", [], binaryen.none));
        for (let value of expressions) {
            exps.push(...value.read(module));
        }
        for (let value of expressions) {
            exps.push(...value.write(module));
        }
        exps.push(module.call("leave", [], binaryen.none));
        module.addFunction("cycle", binaryen.createType([]), binaryen.none, [], module.block("cycle_block", exps, binaryen.none));
        module.addFunctionExport("cycle", "cycle");
    }
    declareExpressionFunctions(module, expressions) {
        for (let value of expressions) {
            value.functions(module);
            const exports = value.exports();
            for (let k in exports) {
                module.addFunctionExport(exports[k], k);
            }
        }
    }
    validate(module) {
        if (!module.validate()) {
            throw new Error("Web Assembly module validation failed!");
        }
    }
    exports(rt) {
        const linker = new wa.Linker({
            generated: new WebAssembly.Module(this.binaryCode.buffer)
        });
        return linker.link(rt.instances).generated.exports;
    }
}
class StaticMemoryAllocatorImpl {
    constructor(module) {
        this.module = module;
        this.offset = 0;
        this.segments = [];
    }
    declare(vector, initialValue) {
        return this.allocate(vector.componentType.sizeInBytes, vector.buffer(initialValue));
    }
    allocate(wordSize, array) {
        const alignment = (wordSize - this.offset % wordSize) % wordSize;
        const result = this.offset + alignment;
        const segment = {
            data: new Uint8Array(array),
            offset: this.module.i32.const(result),
            passive: false
        };
        this.segments.push(segment);
        this.offset = result + segment.data.length;
        return result;
    }
    get stackOffset() {
        return this.offset;
    }
    get memorySegments() {
        return this.segments;
    }
}
function charCodesOf(stackMarker) {
    const stackMarkerArray = [];
    for (let i = 0; i < stackMarker.length; i++) {
        stackMarkerArray.push(stackMarker.charCodeAt(i));
    }
    return stackMarkerArray;
}
function flatten(expressions) {
    function visit(expression, visited) {
        if (!visited.has(expression)) {
            visited.add(expression);
            for (let exp of expression.subExpressions()) {
                visit(exp, visited);
            }
        }
    }
    const result = new Set();
    for (let exp of expressions) {
        visit(exp, result);
    }
    return [...result];
}
