import * as types from './datatypes.js'
import * as exps from './expressions.js'
import { wa, rt } from 'aether'

import binaryen from 'binaryen'

export class Assembler {

    readonly rawMemTextCode: string;
    readonly rawMemBinaryCode: Uint8Array

    readonly nonOptimizedTextCode: string;
    readonly nonOptimizedBinaryCode: Uint8Array;

    readonly textCode: string;
    readonly binaryCode: Uint8Array

    constructor(expressions: exps.Expression[]) {
        const allExpressions = flatten(expressions)
        const rawMemModule = this.newModule(false)
        const module = this.newModule(true)
        try {
            this.organizeMemory(rawMemModule, allExpressions)
            
            this.validate(rawMemModule)
            rawMemModule.optimize()
            this.rawMemTextCode = rawMemModule.emitText()
            this.rawMemBinaryCode =  rawMemModule.emitBinary()

            this.declareCycleFunction(module, allExpressions);
            this.declareExpressionFunctions(module, allExpressions);
    
            this.validate(module)
            this.nonOptimizedTextCode = module.emitText()
            this.nonOptimizedBinaryCode = module.emitBinary()
    
            module.optimize()
            this.textCode = module.emitText()
            this.binaryCode = module.emitBinary()
            
            console.log(`Raw memory code: \n${this.rawMemTextCode}`)
            console.log(`Final code: \n${this.textCode}`)
        } catch (e) {
            console.log(e)
            console.log(`Bad code: \n${module.emitText()}`)
            throw e
        } finally {
            rawMemModule.dispose()
            module.dispose()
        }
    }

    private newModule(withRT: boolean) {
        const module = new binaryen.Module();
        module.setFeatures(module.getFeatures() | binaryen.Features.BulkMemory);
        if (withRT) {
            addImportsToModule(module)
        }
        return module;
    }

    private organizeMemory(module: binaryen.Module, expressions: exps.Expression[]) {
        const memoryBuilder = new StaticMemoryBuilder(module);
        for (let value of expressions) {
            value.memory(memoryBuilder);
        }
        memoryBuilder.build();
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

    get rawMem() {
        return this.rawMemBinaryCode.buffer
    }

    exports<E extends WebAssembly.Exports>(rt: rt.Runtime): E {
        return new wa.Linker(rt.instances)
            .link({
                generated: new WebAssembly.Module(this.binaryCode.buffer)
            })
            .instances.generated.exports;
    }

}

class StaticMemoryBuilder implements exps.StaticMemoryAllocator {

    private offset: number = 0
    private segments: binaryen.MemorySegment[] = []

    constructor(private module: binaryen.Module) {
        this.allocate(4, [0, 0, 0, 0])
    }
    
    declare<A extends types.NumberArray>(vector: types.Vector<A>, initialValue: number[]): number {
        return this.allocate<A>(
            vector.componentType.sizeInBytes, 
            vector.buffer(initialValue)
        );
    }

    build() {
        this.allocate(8, charCodesOf("STACK..."));
        const minPages = (this.offset + 0xFFFF) / 0x10000;
        new Uint32Array(this.segments[0].data.buffer)[0] = this.offset
        this.module.setMemory(minPages, 65536, "mem", this.segments);
    }
    
    private allocate<A extends types.NumberArray>(wordSize: types.PrimitiveSize<A>, array: ArrayBufferLike | ArrayLike<number>) {
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

export function addImportsToModule(module: binaryen.Module) {
    addMemImportsToModule(module)
    addSpaceImportsToModule(module)
    addDelayImportsToModule(module)
}

export function addMemImportsToModule(module: binaryen.Module) {
    module.addMemoryImport("stack", "mem", "stack")
    module.addFunctionImport("enter", "mem", "enter", binaryen.createType([]), binaryen.none)
    module.addFunctionImport("leave", "mem", "leave", binaryen.createType([]), binaryen.none)
    module.addFunctionImport("return_i32", "mem", "return_i32", binaryen.createType([binaryen.i32]), binaryen.i32)
    module.addFunctionImport("return_i64", "mem", "return_i64", binaryen.createType([binaryen.i64]), binaryen.i64)
    module.addFunctionImport("return_f32", "mem", "return_f32", binaryen.createType([binaryen.f32]), binaryen.f32)
    module.addFunctionImport("return_f64", "mem", "return_f64", binaryen.createType([binaryen.f64]), binaryen.f64)

    module.addFunctionImport("allocate8", "mem", "allocate8", binaryen.createType([binaryen.i32]), binaryen.i32)
    module.addFunctionImport("allocate16", "mem", "allocate16", binaryen.createType([binaryen.i32]), binaryen.i32)
    module.addFunctionImport("allocate32", "mem", "allocate32", binaryen.createType([binaryen.i32]), binaryen.i32)
    module.addFunctionImport("allocate64", "mem", "allocate64", binaryen.createType([binaryen.i32]), binaryen.i32)

    // module.addFunctionImport("clone8", "mem", "clone8", binaryen.createType([binaryen.i32, binaryen.i32]), binaryen.i32)
    // module.addFunctionImport("clone16", "mem", "clone16", binaryen.createType([binaryen.i32, binaryen.i32]), binaryen.i32)
    // module.addFunctionImport("clone32", "mem", "clone32", binaryen.createType([binaryen.i32, binaryen.i32]), binaryen.i32)
    // module.addFunctionImport("clone64", "mem", "clone64", binaryen.createType([binaryen.i32, binaryen.i32]), binaryen.i32)
}

export function addSpaceImportsToModule(module: binaryen.Module) {
    const vec1_vec2 = binaryen.createType([binaryen.i32, binaryen.i32]);
    const size_vec1_vec2 = binaryen.createType([binaryen.i32, binaryen.i32, binaryen.i32]);
    const vec1_vec2_result = binaryen.createType([binaryen.i32, binaryen.i32, binaryen.i32]);
    const size_vec1_vec2_result = binaryen.createType([binaryen.i32, binaryen.i32, binaryen.i32, binaryen.i32]);
    const vec_scalar = binaryen.createType([binaryen.i32, binaryen.f64]);
    const size_vec_scalar = binaryen.createType([binaryen.i32, binaryen.i32, binaryen.f64]);
    const vec_scalar_result = binaryen.createType([binaryen.i32, binaryen.f64, binaryen.i32]);
    const size_vec_scalar_result = binaryen.createType([binaryen.i32, binaryen.i32, binaryen.f64, binaryen.i32]);
    const vec = binaryen.createType([binaryen.i32]);
    const size_vec = binaryen.createType([binaryen.i32, binaryen.i32]);
    const vec_result = binaryen.createType([binaryen.i32, binaryen.i32]);
    const size_vec_result = binaryen.createType([binaryen.i32, binaryen.i32, binaryen.i32]);

    module.addFunctionImport("f64_vec2_add", "space", "f64_vec2_add", vec1_vec2, binaryen.i32)
    module.addFunctionImport("f64_vec2_add_r", "space", "f64_vec2_add_r", vec1_vec2_result, binaryen.i32)
    module.addFunctionImport("f64_vec3_add", "space", "f64_vec3_add", vec1_vec2, binaryen.i32)
    module.addFunctionImport("f64_vec3_add_r", "space", "f64_vec3_add_r", vec1_vec2_result, binaryen.i32)
    module.addFunctionImport("f64_vec4_add", "space", "f64_vec4_add", vec1_vec2, binaryen.i32)
    module.addFunctionImport("f64_vec4_add_r", "space", "f64_vec4_add_r", vec1_vec2_result, binaryen.i32)
    module.addFunctionImport("f64_vec_add", "space", "f64_vec_add", size_vec1_vec2, binaryen.i32)
    module.addFunctionImport("f64_vec_add_r", "space", "f64_vec_add_r", size_vec1_vec2_result, binaryen.i32)

    module.addFunctionImport("f64_vec2_sub", "space", "f64_vec2_sub", vec1_vec2, binaryen.i32)
    module.addFunctionImport("f64_vec2_sub_r", "space", "f64_vec2_sub_r", vec1_vec2_result, binaryen.i32)
    module.addFunctionImport("f64_vec3_sub", "space", "f64_vec3_sub", vec1_vec2, binaryen.i32)
    module.addFunctionImport("f64_vec3_sub_r", "space", "f64_vec3_sub_r", vec1_vec2_result, binaryen.i32)
    module.addFunctionImport("f64_vec4_sub", "space", "f64_vec4_sub", vec1_vec2, binaryen.i32)
    module.addFunctionImport("f64_vec4_sub_r", "space", "f64_vec4_sub_r", vec1_vec2_result, binaryen.i32)
    module.addFunctionImport("f64_vec_sub", "space", "f64_vec_sub", size_vec1_vec2, binaryen.i32)
    module.addFunctionImport("f64_vec_sub_r", "space", "f64_vec_sub_r", size_vec1_vec2_result, binaryen.i32)

    module.addFunctionImport("f64_vec2_mul", "space", "f64_vec2_mul", vec1_vec2, binaryen.i32)
    module.addFunctionImport("f64_vec2_mul_r", "space", "f64_vec2_mul_r", vec1_vec2_result, binaryen.i32)
    module.addFunctionImport("f64_vec3_mul", "space", "f64_vec3_mul", vec1_vec2, binaryen.i32)
    module.addFunctionImport("f64_vec3_mul_r", "space", "f64_vec3_mul_r", vec1_vec2_result, binaryen.i32)
    module.addFunctionImport("f64_vec4_mul", "space", "f64_vec4_mul", vec1_vec2, binaryen.i32)
    module.addFunctionImport("f64_vec4_mul_r", "space", "f64_vec4_mul_r", vec1_vec2_result, binaryen.i32)
    module.addFunctionImport("f64_vec_mul", "space", "f64_vec_mul", size_vec1_vec2, binaryen.i32)
    module.addFunctionImport("f64_vec_mul_r", "space", "f64_vec_mul_r", size_vec1_vec2_result, binaryen.i32)

    module.addFunctionImport("f64_vec2_div", "space", "f64_vec2_div", vec1_vec2, binaryen.i32)
    module.addFunctionImport("f64_vec2_div_r", "space", "f64_vec2_div_r", vec1_vec2_result, binaryen.i32)
    module.addFunctionImport("f64_vec3_div", "space", "f64_vec3_div", vec1_vec2, binaryen.i32)
    module.addFunctionImport("f64_vec3_div_r", "space", "f64_vec3_div_r", vec1_vec2_result, binaryen.i32)
    module.addFunctionImport("f64_vec4_div", "space", "f64_vec4_div", vec1_vec2, binaryen.i32)
    module.addFunctionImport("f64_vec4_div_r", "space", "f64_vec4_div_r", vec1_vec2_result, binaryen.i32)
    module.addFunctionImport("f64_vec_div", "space", "f64_vec_div", size_vec1_vec2, binaryen.i32)
    module.addFunctionImport("f64_vec_div_r", "space", "f64_vec_div_r", size_vec1_vec2_result, binaryen.i32)

    module.addFunctionImport("f64_vec2_scalar_mul", "space", "f64_vec2_scalar_mul", vec_scalar, binaryen.i32)
    module.addFunctionImport("f64_vec2_scalar_mul_r", "space", "f64_vec2_scalar_mul_r", vec_scalar_result, binaryen.i32)
    module.addFunctionImport("f64_vec3_scalar_mul", "space", "f64_vec3_scalar_mul", vec_scalar, binaryen.i32)
    module.addFunctionImport("f64_vec3_scalar_mul_r", "space", "f64_vec3_scalar_mul_r", vec_scalar_result, binaryen.i32)
    module.addFunctionImport("f64_vec4_scalar_mul", "space", "f64_vec4_scalar_mul", vec_scalar, binaryen.i32)
    module.addFunctionImport("f64_vec4_scalar_mul_r", "space", "f64_vec4_scalar_mul_r", vec_scalar_result, binaryen.i32)
    module.addFunctionImport("f64_vec_scalar_mul", "space", "f64_vec_scalar_mul", size_vec_scalar, binaryen.i32)
    module.addFunctionImport("f64_vec_scalar_mul_r", "space", "f64_vec_scalar_mul_r", size_vec_scalar_result, binaryen.i32)

    module.addFunctionImport("f64_vec2_scalar_div", "space", "f64_vec2_scalar_div", vec_scalar, binaryen.i32)
    module.addFunctionImport("f64_vec2_scalar_div_r", "space", "f64_vec2_scalar_div_r", vec_scalar_result, binaryen.i32)
    module.addFunctionImport("f64_vec3_scalar_div", "space", "f64_vec3_scalar_div", vec_scalar, binaryen.i32)
    module.addFunctionImport("f64_vec3_scalar_div_r", "space", "f64_vec3_scalar_div_r", vec_scalar_result, binaryen.i32)
    module.addFunctionImport("f64_vec4_scalar_div", "space", "f64_vec4_scalar_div", vec_scalar, binaryen.i32)
    module.addFunctionImport("f64_vec4_scalar_div_r", "space", "f64_vec4_scalar_div_r", vec_scalar_result, binaryen.i32)
    module.addFunctionImport("f64_vec_scalar_div", "space", "f64_vec_scalar_div", size_vec_scalar, binaryen.i32)
    module.addFunctionImport("f64_vec_scalar_div_r", "space", "f64_vec_scalar_div_r", size_vec_scalar_result, binaryen.i32)

    module.addFunctionImport("f64_vec2_dot", "space", "f64_vec2_dot", vec1_vec2, binaryen.f64)
    module.addFunctionImport("f64_vec3_dot", "space", "f64_vec3_dot", vec1_vec2, binaryen.f64)
    module.addFunctionImport("f64_vec4_dot", "space", "f64_vec4_dot", vec1_vec2, binaryen.f64)
    module.addFunctionImport("f64_vec_dot", "space", "f64_vec_dot", vec1_vec2_result, binaryen.f64)

    module.addFunctionImport("f64_vec2_length", "space", "f64_vec2_length", vec, binaryen.f64)
    module.addFunctionImport("f64_vec3_length", "space", "f64_vec3_length", vec, binaryen.f64)
    module.addFunctionImport("f64_vec4_length", "space", "f64_vec4_length", vec, binaryen.f64)
    module.addFunctionImport("f64_vec_length", "space", "f64_vec_length", size_vec, binaryen.f64)

    module.addFunctionImport("f64_vec2_normalize", "space", "f64_vec2_normalize", vec, binaryen.i32)
    module.addFunctionImport("f64_vec2_normalize_r", "space", "f64_vec2_normalize_r", vec_result, binaryen.i32)
    module.addFunctionImport("f64_vec3_normalize", "space", "f64_vec3_normalize", vec, binaryen.i32)
    module.addFunctionImport("f64_vec3_normalize_r", "space", "f64_vec3_normalize_r", vec_result, binaryen.i32)
    module.addFunctionImport("f64_vec4_normalize", "space", "f64_vec4_normalize", vec, binaryen.i32)
    module.addFunctionImport("f64_vec4_normalize_r", "space", "f64_vec4_normalize_r", vec_result, binaryen.i32)
    module.addFunctionImport("f64_vec_normalize", "space", "f64_vec_normalize", size_vec, binaryen.i32)
    module.addFunctionImport("f64_vec_normalize_r", "space", "f64_vec_normalize_r", size_vec_result, binaryen.i32)
}

export function addDelayImportsToModule(module: binaryen.Module) {
    module.addFunctionImport("create_delay", "delay", "create_delay", binaryen.createType([binaryen.i32, binaryen.i32]), binaryen.i32)
    module.addFunctionImport("item_ref", "delay", "item_ref", binaryen.createType([binaryen.i32, binaryen.i32]), binaryen.i32)
    module.addFunctionImport("rotate", "delay", "rotate", binaryen.createType([binaryen.i32]), binaryen.i32)
}
