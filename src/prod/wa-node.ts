import * as wa from "./wa.js"

import fs from 'fs'

export * from "./wa.js"

export const fsModulesLoader: wa.ModulesLoader = async (waPath, modulePaths) => fsLoadModules(waPath, modulePaths)

export function fsLoadModules<N extends string>(waPath: string, modulePaths: wa.WebAssemblyModulePaths<N>): wa.WebAssemblyModules<N> {
    const result: wa.WebAssemblyModules<string> = {}
    for (const moduleName in modulePaths) {
        const modulePath = modulePaths[moduleName]
        const buffer = fs.readFileSync(`${waPath}/${modulePath}`)
        result[moduleName] = new WebAssembly.Module(buffer)
    }
    return result
}
