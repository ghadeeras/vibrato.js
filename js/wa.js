var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import fs from 'fs';
export function module(sourceFile) {
    return {
        sourceFile: sourceFile,
    };
}
export function instantiate(buffer, dependencies) {
    const waModule = new WebAssembly.Module(buffer);
    const waInstance = new WebAssembly.Instance(waModule, asImports(dependencies));
    return waInstance.exports;
}
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
export function loadFS(waPath, modules, first, ...rest) {
    const firstModule = modules[first];
    if (!firstModule.exports) {
        const buffer = fs.readFileSync(waPath + "/" + firstModule.sourceFile);
        firstModule.exports = instantiate(buffer, modules);
    }
    return rest.length == 0 ? modules : loadFS(waPath, modules, rest[0], ...rest.slice(1));
}
function asImports(modules) {
    const imports = {};
    for (let key in modules) {
        imports[key] = modules[key].exports || {};
    }
    return imports;
}
//# sourceMappingURL=wa.js.map