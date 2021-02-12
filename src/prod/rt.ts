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

export function addImportsToModule(module: binaryen.Module) {
    addMemImportsToModule(module)
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

const modules = {
    mem: wa.module<MemExports>("mem.wasm")
}

export type RuntimeModules = typeof modules

export async function initWaModulesWeb(waPath: string) {
    return wa.loadWeb(waPath, modules, "mem");
}

export function initWaModulesFS(waPath: string) {
    return wa.loadFS(waPath, modules, "mem");
}
