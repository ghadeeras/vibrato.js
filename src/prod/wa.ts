import fs from 'fs'

export type Module<E extends WebAssembly.Exports> = {
    readonly sourceFile: string;
    exports?: E; 
}

export type Modules = Readonly<Record<string, Module<WebAssembly.Exports>>>

export type ModuleName<M extends Modules> = keyof M;

export function module<E extends WebAssembly.Exports>(sourceFile: string): Module<E> {
    return {
        sourceFile: sourceFile,
    }
}

export function instantiate<E extends WebAssembly.Exports>(buffer: ArrayBuffer, dependencies: Modules): E {
    const waModule = new WebAssembly.Module(buffer)
    const waInstance = new WebAssembly.Instance(waModule, asImports(dependencies))
    return waInstance.exports as E
}

export async function loadWeb<M extends Modules>(waPath: string, modules: M, first: ModuleName<M>, ...rest: ModuleName<M>[]): Promise<M> {
    const firstModule = modules[first]
    if (!firstModule.exports) {
        const response = await fetch(waPath + "/" + firstModule.sourceFile, { method : "get", mode : "no-cors" })
        const buffer = await response.arrayBuffer()
        firstModule.exports = instantiate(buffer, modules)
    }
    return rest.length == 0 ? modules : loadWeb(waPath, modules, rest[0], ...rest.slice(1))
}

export function loadFS<M extends Modules>(waPath: string, modules: M, first: ModuleName<M>, ...rest: ModuleName<M>[]): M {
    const firstModule = modules[first]
    if (!firstModule.exports) {
        const buffer = fs.readFileSync(waPath + "/" + firstModule.sourceFile)
        firstModule.exports = instantiate(buffer, modules)
    }
    return rest.length == 0 ? modules : loadFS(waPath, modules, rest[0], ...rest.slice(1))
}

function asImports<M extends Modules>(modules: M): WebAssembly.Imports {
    const imports: WebAssembly.Imports = {};
    for (let key in modules) {
        imports[key] = modules[key].exports || {};
    }
    return imports;
}