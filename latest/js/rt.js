var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import * as wa from "./wa.js";
/**
 * @deprecated
 */
export function modules() {
    return {
        mem: wa.module("mem.wasm"),
        space: wa.module("space.wasm"),
        delay: wa.module("delay.wasm"),
    };
}
/**
 * @deprecated
 */
export function initWaModulesWeb(waPath) {
    return __awaiter(this, void 0, void 0, function* () {
        return wa.loadWeb(waPath, modules(), "mem", "space", "delay");
    });
}
export function runtimeModulePaths() {
    return {
        mem: "mem.wasm",
        space: "space.wasm",
        delay: "delay.wasm",
    };
}
export function webRuntime(waPath) {
    return __awaiter(this, void 0, void 0, function* () {
        const modules = yield webLoadRuntimeModules(waPath);
        return linkRuntime(modules);
    });
}
export function webLoadRuntimeModules(waPath) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield wa.webLoadModules(waPath, runtimeModulePaths());
    });
}
export function linkRuntime(modules) {
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
