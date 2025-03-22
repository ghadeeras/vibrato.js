import { wa } from "aether"

import fs from 'fs'

export const fsModulesLoader = async <N extends string>(waPath: string, modulePaths: wa.WebAssemblyModulePaths<N>) => fsLoadModules(waPath, modulePaths)
export const syncFsModulesLoader = <N extends string>(waPath: string, modulePaths: wa.WebAssemblyModulePaths<N>) => fsLoadModules(waPath, modulePaths)

export function fsLoadModules<N extends string>(waPath: string, modulePaths: wa.WebAssemblyModulePaths<N>): wa.WebAssemblyModules<N> {
    return wa.syncLoadModules(waPath, modulePaths, fs.readFileSync)
}
