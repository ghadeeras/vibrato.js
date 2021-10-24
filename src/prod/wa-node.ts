import * as wa from "./wa.js"

import fs from 'fs'

export * from "./wa.js"

/**
 * @deprecated
 */
 export function loadFS<M extends wa.Modules>(waPath: string, modules: M, first: wa.ModuleName<M>, ...rest: wa.ModuleName<M>[]): M {
    const firstModule = modules[first]
    if (!firstModule.exports) {
        const buffer = fs.readFileSync(waPath + "/" + firstModule.sourceFile)
        firstModule.exports = wa.instantiate(buffer, modules)
    }
    return rest.length == 0 ? modules : loadFS(waPath, modules, rest[0], ...rest.slice(1))
}

export function fsLoadModules<N extends string>(waPath: string, modulePaths: wa.WebAssemblyModulePaths<N>): wa.WebAssemblyModules<N> {
    const result: wa.WebAssemblyModules<string> = {}
    for (const moduleName in modulePaths) {
        const modulePath = modulePaths[moduleName]
        const buffer = fs.readFileSync(`${waPath}/${modulePath}`)
        result[moduleName] = new WebAssembly.Module(buffer)
    }
    return result
}
