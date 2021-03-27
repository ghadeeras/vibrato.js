import * as wa from "./wa.js"

import binaryen from 'binaryen'

export type Reference = number;

export type MemExports = {
    
    stack: WebAssembly.Memory;

    enter: () => void;
    leave: () => void;

    allocate8: (size: number) => Reference;
    allocate16: (size: number) => Reference;
    allocate32: (size: number) => Reference;
    allocate64: (size: number) => Reference;

    clone8: (size: number, ref: Reference) => Reference;
    clone16: (size: number, ref: Reference) => Reference;
    clone32: (size: number, ref: Reference) => Reference;
    clone64: (size: number, ref: Reference) => Reference;
}

export type SpaceExports = {
    
    f64_vec2_add: (v1: Reference, v2: Reference) => Reference;
    f64_vec2_add_r: (v1: Reference, v2: Reference, result: Reference) => Reference;
    f64_vec3_add: (v1: Reference, v2: Reference) => Reference;
    f64_vec3_add_r: (v1: Reference, v2: Reference, result: Reference) => Reference;
    f64_vec4_add: (v1: Reference, v2: Reference) => Reference;
    f64_vec4_add_r: (v1: Reference, v2: Reference, result: Reference) => Reference;
    f64_vec_add: (size: number, v1: Reference, v2: Reference) => Reference;
    f64_vec_add_r: (size: number, v1: Reference, v2: Reference, result: Reference) => Reference;

    f64_vec2_sub: (v1: Reference, v2: Reference) => Reference;
    f64_vec2_sub_r: (v1: Reference, v2: Reference, result: Reference) => Reference;
    f64_vec3_sub: (v1: Reference, v2: Reference) => Reference;
    f64_vec3_sub_r: (v1: Reference, v2: Reference, result: Reference) => Reference;
    f64_vec4_sub: (v1: Reference, v2: Reference) => Reference;
    f64_vec4_sub_r: (v1: Reference, v2: Reference, result: Reference) => Reference;
    f64_vec_sub: (size: number, v1: Reference, v2: Reference) => Reference;
    f64_vec_sub_r: (size: number, v1: Reference, v2: Reference, result: Reference) => Reference;

    f64_vec2_mul: (v1: Reference, v2: Reference) => Reference;
    f64_vec2_mul_r: (v1: Reference, v2: Reference, result: Reference) => Reference;
    f64_vec3_mul: (v1: Reference, v2: Reference) => Reference;
    f64_vec3_mul_r: (v1: Reference, v2: Reference, result: Reference) => Reference;
    f64_vec4_mul: (v1: Reference, v2: Reference) => Reference;
    f64_vec4_mul_r: (v1: Reference, v2: Reference, result: Reference) => Reference;
    f64_vec_mul: (size: number, v1: Reference, v2: Reference) => Reference;
    f64_vec_mul_r: (size: number, v1: Reference, v2: Reference, result: Reference) => Reference;

    f64_vec2_div: (v1: Reference, v2: Reference) => Reference;
    f64_vec2_div_r: (v1: Reference, v2: Reference, result: Reference) => Reference;
    f64_vec3_div: (v1: Reference, v2: Reference) => Reference;
    f64_vec3_div_r: (v1: Reference, v2: Reference, result: Reference) => Reference;
    f64_vec4_div: (v1: Reference, v2: Reference) => Reference;
    f64_vec4_div_r: (v1: Reference, v2: Reference, result: Reference) => Reference;
    f64_vec_div: (size: number, v1: Reference, v2: Reference) => Reference;
    f64_vec_div_r: (size: number, v1: Reference, v2: Reference, result: Reference) => Reference;

    f64_vec2_scalar_mul: (v: Reference, s: number) => Reference;
    f64_vec2_scalar_mul_r: (v: Reference, s: number, result: Reference) => Reference;
    f64_vec3_scalar_mul: (v: Reference, s: number) => Reference;
    f64_vec3_scalar_mul_r: (v: Reference, s: number, result: Reference) => Reference;
    f64_vec4_scalar_mul: (v: Reference, s: number) => Reference;
    f64_vec4_scalar_mul_r: (v: Reference, s: number, result: Reference) => Reference;
    f64_vec_scalar_mul: (size: number, v: Reference, s: number) => Reference;
    f64_vec_scalar_mul_r: (size: number, v: Reference, s: number, result: Reference) => Reference;

    f64_vec2_scalar_div: (v: Reference, s: number) => Reference;
    f64_vec2_scalar_div_r: (v: Reference, s: number, result: Reference) => Reference;
    f64_vec3_scalar_div: (v: Reference, s: number) => Reference;
    f64_vec3_scalar_div_r: (v: Reference, s: number, result: Reference) => Reference;
    f64_vec4_scalar_div: (v: Reference, s: number) => Reference;
    f64_vec4_scalar_div_r: (v: Reference, s: number, result: Reference) => Reference;
    f64_vec_scalar_div: (size: number, v: Reference, s: number) => Reference;
    f64_vec_scalar_div_r: (size: number, v: Reference, s: number, result: Reference) => Reference;

    f64_vec2_dot: (v1: Reference, v2: Reference) => number;
    f64_vec3_dot: (v1: Reference, v2: Reference) => number;
    f64_vec4_dot: (v1: Reference, v2: Reference) => number;
    f64_vec_dot: (size: number, v1: Reference, v2: Reference) => number;

    f64_vec2_length: (v: Reference) => number;
    f64_vec3_length: (v: Reference) => number;
    f64_vec4_length: (v: Reference) => number;
    f64_vec_length: (size: number, v: Reference) => number;

    f64_vec2_normalize: (v: Reference) => Reference;
    f64_vec2_normalize_r: (v: Reference, result: Reference) => Reference;
    f64_vec3_normalize: (v: Reference) => Reference;
    f64_vec3_normalize_r: (v: Reference, result: Reference) => Reference;
    f64_vec4_normalize: (v: Reference) => Reference;
    f64_vec4_normalize_r: (v: Reference, result: Reference) => Reference;
    f64_vec_normalize: (size: number, v: Reference) => Reference;
    f64_vec_normalize_r: (size: number, v: Reference, result: Reference) => Reference;

}

export function addImportsToModule(module: binaryen.Module) {
    addMemImportsToModule(module)
    addSpaceImportsToModule(module)
}

export function addMemImportsToModule(module: binaryen.Module) {
    module.addMemoryImport("stack", "mem", "stack")
    module.addFunctionImport("enter", "mem", "enter", binaryen.createType([]), binaryen.none)
    module.addFunctionImport("leave", "mem", "leave", binaryen.createType([]), binaryen.none)

    module.addFunctionImport("allocate8", "mem", "allocate8", binaryen.createType([binaryen.i32]), binaryen.i32)
    module.addFunctionImport("allocate16", "mem", "allocate16", binaryen.createType([binaryen.i32]), binaryen.i32)
    module.addFunctionImport("allocate32", "mem", "allocate32", binaryen.createType([binaryen.i32]), binaryen.i32)
    module.addFunctionImport("allocate64", "mem", "allocate64", binaryen.createType([binaryen.i32]), binaryen.i32)

    module.addFunctionImport("clone8", "mem", "clone8", binaryen.createType([binaryen.i32, binaryen.i32]), binaryen.i32)
    module.addFunctionImport("clone16", "mem", "clone16", binaryen.createType([binaryen.i32, binaryen.i32]), binaryen.i32)
    module.addFunctionImport("clone32", "mem", "clone32", binaryen.createType([binaryen.i32, binaryen.i32]), binaryen.i32)
    module.addFunctionImport("clone64", "mem", "clone64", binaryen.createType([binaryen.i32, binaryen.i32]), binaryen.i32)
}

export function addSpaceImportsToModule(module: binaryen.Module) {
    const vec1_vec2 = binaryen.createType([binaryen.i32, binaryen.i32]);
    const size_vec1_vec2 = binaryen.createType([binaryen.i32, binaryen.i32, binaryen.i32]);
    const vec1_vec2_result = binaryen.createType([binaryen.i32, binaryen.i32, binaryen.i32]);
    const size_vec1_vec2_result = binaryen.createType([binaryen.i32, binaryen.i32, binaryen.i32, binaryen.i32]);
    const vec_scalar = binaryen.createType([binaryen.i32, binaryen.f64]);
    const size_vec_scalar = binaryen.createType([binaryen.i32, binaryen.f64]);
    const vec_scalar_result = binaryen.createType([binaryen.i32, binaryen.f64, binaryen.i32]);
    const size_vec_scalar_result = binaryen.createType([binaryen.i32, binaryen.f64, binaryen.i32]);
    const vec = binaryen.createType([binaryen.i32]);
    const size_vec = binaryen.createType([binaryen.i32]);
    const vec_result = binaryen.createType([binaryen.i32, binaryen.i32]);
    const size_vec_result = binaryen.createType([binaryen.i32, binaryen.i32]);

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

    module.addFunctionImport("f64_vec2_length", "space", "f64_vec2_dot", vec, binaryen.f64)
    module.addFunctionImport("f64_vec3_length", "space", "f64_vec3_dot", vec, binaryen.f64)
    module.addFunctionImport("f64_vec4_length", "space", "f64_vec4_dot", vec, binaryen.f64)
    module.addFunctionImport("f64_vec_length", "space", "f64_vec_dot", size_vec, binaryen.f64)

    module.addFunctionImport("f64_vec2_normalize", "space", "f64_vec2_normalize", vec, binaryen.i32)
    module.addFunctionImport("f64_vec2_normalize_r", "space", "f64_vec2_normalize_r", vec_result, binaryen.i32)
    module.addFunctionImport("f64_vec3_normalize", "space", "f64_vec3_normalize", vec, binaryen.i32)
    module.addFunctionImport("f64_vec3_normalize_r", "space", "f64_vec3_normalize_r", vec_result, binaryen.i32)
    module.addFunctionImport("f64_vec4_normalize", "space", "f64_vec4_normalize", vec, binaryen.i32)
    module.addFunctionImport("f64_vec4_normalize_r", "space", "f64_vec4_normalize_r", vec_result, binaryen.i32)
    module.addFunctionImport("f64_vec_normalize", "space", "f64_vec_normalize", size_vec, binaryen.i32)
    module.addFunctionImport("f64_vec_normalize_r", "space", "f64_vec_normalize_r", size_vec_result, binaryen.i32)
}

const modules = {
    mem: wa.module<MemExports>("mem.wasm"),
    space: wa.module<SpaceExports>("space.wasm")
}

export type RuntimeModules = typeof modules

export async function initWaModulesWeb(waPath: string) {
    return wa.loadWeb(waPath, modules, "mem", "space");
}

export function initWaModulesFS(waPath: string) {
    return wa.loadFS(waPath, modules, "mem", "space");
}
