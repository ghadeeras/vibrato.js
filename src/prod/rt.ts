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
}

export function addSpaceImportsToModule(module: binaryen.Module) {
    const fOp = binaryen.createType([binaryen.i32, binaryen.i32]);
    const pOp = binaryen.createType([binaryen.i32, binaryen.i32, binaryen.i32]);
    module.addFunctionImport("f64_vec2_add", "space", "f64_vec2_add", fOp, binaryen.i32)
    module.addFunctionImport("f64_vec2_add_r", "space", "f64_vec2_add_r", pOp, binaryen.i32)
    module.addFunctionImport("f64_vec3_add", "space", "f64_vec3_add", fOp, binaryen.i32)
    module.addFunctionImport("f64_vec3_add_r", "space", "f64_vec3_add_r", pOp, binaryen.i32)
    module.addFunctionImport("f64_vec4_add", "space", "f64_vec4_add", fOp, binaryen.i32)
    module.addFunctionImport("f64_vec4_add_r", "space", "f64_vec4_add_r", pOp, binaryen.i32)
    module.addFunctionImport("f64_vec_add", "space", "f64_vec_add", fOp, binaryen.i32)
    module.addFunctionImport("f64_vec_add_r", "space", "f64_vec_add_r", pOp, binaryen.i32)
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
