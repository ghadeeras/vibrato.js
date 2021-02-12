var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
/**
 * @deprecated
 */
export function module(sourceFile) {
    return {
        sourceFile: sourceFile,
    };
}
/**
 * @deprecated
 */
export function instantiate(buffer, dependencies) {
    const waModule = new WebAssembly.Module(buffer);
    const waInstance = new WebAssembly.Instance(waModule, asImports(dependencies));
    return waInstance.exports;
}
/**
 * @deprecated
 */
export function loadWeb(waPath, modules, first, ...rest) {
    return __awaiter(this, void 0, void 0, function* () {
        const firstModule = modules[first];
        if (!firstModule.exports) {
            const response = yield fetch(waPath + "/" + firstModule.sourceFile, { method: "get", mode: "no-cors" });
            const buffer = yield response.arrayBuffer();
            firstModule.exports = instantiate(buffer, modules);
        }
        return rest.length == 0 ? modules : loadWeb(waPath, modules, rest[0], ...rest.slice(1));
    });
}
/**
 * @deprecated
 */
function asImports(modules) {
    const imports = {};
    for (let key in modules) {
        imports[key] = modules[key].exports || {};
    }
    return imports;
}
export function webLoadModules(waPath, modulePaths) {
    return __awaiter(this, void 0, void 0, function* () {
        const result = {};
        for (const moduleName in modulePaths) {
            const modulePath = modulePaths[moduleName];
            const response = yield fetch(`${waPath}/${modulePath}`, { method: "get", mode: "no-cors" });
            const buffer = yield response.arrayBuffer();
            result[moduleName] = new WebAssembly.Module(buffer);
        }
        return result;
    });
}
export class Linker {
    constructor(modules) {
        this.modules = modules;
        this.linking = new Set();
        this.instances = {};
    }
    link(externalInstances) {
        this.linking.clear();
        this.instances = Object.assign({}, externalInstances);
        for (const moduleName in this.modules) {
            this.linkModule(moduleName);
        }
        const result = this.instances;
        this.instances = {};
        return result;
    }
    linkModule(moduleName) {
        if (this.beginLinking(moduleName)) {
            const waModule = this.getModule(moduleName);
            const impDescriptors = WebAssembly.Module.imports(waModule);
            for (const descriptor of impDescriptors) {
                this.linkModule(descriptor.module);
            }
            const waInstance = new WebAssembly.Instance(waModule, this.asImports(this.instances));
            this.endLinking(moduleName, waInstance);
        }
    }
    asImports(exps) {
        const result = {};
        for (const moduleName in exps) {
            const instance = exps[moduleName];
            result[moduleName] = instance.exports;
        }
        return result;
    }
    getModule(moduleName) {
        if (!(moduleName in this.modules)) {
            throw new Error(`Module ${moduleName} not found`);
        }
        return this.modules[moduleName];
    }
    beginLinking(moduleName) {
        if (moduleName in this.instances) {
            return false;
        }
        if (this.linking.has(moduleName)) {
            throw new Error(`Circular dependency in ${this.linking}`);
        }
        this.linking.add(moduleName);
        return true;
    }
    endLinking(moduleName, waInstance) {
        this.linking.delete(moduleName);
        this.instances[moduleName] = waInstance;
    }
}
export function required(value) {
    if (!value) {
        throw new Error("Required value is null or undefined!!!");
    }
    return value;
}
