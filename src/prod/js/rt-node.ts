import { rt } from "aether"

import fs from 'fs'

export function runtime(rawMem: ArrayBuffer | null = null): rt.Runtime {
    return rt.syncRuntime(rawMem, fs.readFileSync)
}

