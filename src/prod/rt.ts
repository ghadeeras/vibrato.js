import * as wa from "./wa.js"

export type Reference = number;

export type MemExports = {
    
    stack: WebAssembly.Memory;

    enter: () => void;
    leave: () => void;
    return_i32: (result: number) => number;
    return_i64: (result: number) => number;
    return_f32: (result: number) => number;
    return_f64: (result: number) => number;

    allocate8: (size: number) => Reference;
    allocate16: (size: number) => Reference;
    allocate32: (size: number) => Reference;
    allocate64: (size: number) => Reference;

    // clone8: (size: number, ref: Reference) => Reference;
    // clone16: (size: number, ref: Reference) => Reference;
    // clone32: (size: number, ref: Reference) => Reference;
    // clone64: (size: number, ref: Reference) => Reference;
}

export type SpaceExports = {
    
    f64_vec2: (x: number, y: number) => Reference;
    f64_vec2_r: (x: number, y: number, result: Reference) => Reference;
    f64_vec3: (x: number, y: number, z: number) => Reference;
    f64_vec3_r: (x: number, y: number, z: number, result: Reference) => Reference;
    f64_vec4: (x: number, y: number, z: number, w: number) => Reference;
    f64_vec4_r: (x: number, y: number, z: number, w: number, result: Reference) => Reference;

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

export type DelayExports = {

    create_delay: (delay_length: number, item_size: number) => Reference
    item_ref: (delay_ref: Reference, index: number) => Reference
    rotate: (delay_ref: Reference) => Reference

}

export type RuntimeExports = {
    mem: MemExports
    space: SpaceExports
    delay: DelayExports
}

export type RuntimeModuleNames = keyof RuntimeExports

export type Runtime = {
    modules: wa.WebAssemblyModules<RuntimeModuleNames>
    instances: wa.WebAssemblyInstances<RuntimeModuleNames>
    exports: RuntimeExports
}

export function runtimeModulePaths(): Record<RuntimeModuleNames, string> {
    return {
        mem: "mem.wasm",
        space: "space.wasm",
        delay: "delay.wasm",
    }
} 

export async function webRuntime(waPath: string): Promise<Runtime> {
    const modules = await webLoadRuntimeModules(waPath);
    return linkRuntime(modules);
}

export async function webLoadRuntimeModules(waPath: string): Promise<wa.WebAssemblyModules<RuntimeModuleNames>> {
    return await wa.webLoadModules(waPath, runtimeModulePaths());
}

export function linkRuntime(modules: wa.WebAssemblyModules<RuntimeModuleNames>): Runtime {
    const linker = new wa.Linker(modules);
    const instances = linker.link({});
    return {
        modules: modules,
        instances: instances,
        exports: {
            mem: instances.mem.exports,
            space: instances.space.exports,
            delay: instances.delay.exports,
        }
    };
}
