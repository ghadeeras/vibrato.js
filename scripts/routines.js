import fs from 'fs'
import binaryen from "binaryen"

const src = "./src"
const lib = "./lib"
const waSrc = `${src}/wa`
const waLib = `${lib}/wa`
const jsLib = `${lib}/js`
const prodLib = `${lib}/prod`

export function compileRuntime() {
    console.log("Making sure runtime output directory exists ...")
    if (!fs.existsSync(lib)) {
        fs.mkdirSync(lib)
    }
    if (!fs.existsSync(waLib)) {
        fs.mkdirSync(waLib)
    }
    
    console.log("Building runtime modules ...")
    const watFiles = fs.readdirSync(waSrc).filter(f => f.endsWith(".wat"))
    for (const watFile of watFiles) {
        console.log(`Compiling ${watFile} ...`)
        const buffer = fs.readFileSync(`${waSrc}/${watFile}`)
        const code = buffer.toString("utf-8")
        const module = binaryen.parseText(code)
        module.setFeatures(binaryen.Features.BulkMemory)
        module.optimize()
        const binary = module.emitBinary()
        fs.writeFileSync(`${waLib}/${watFile.replace(".wat", ".wasm")}`, binary)
    }
    console.log("Success!")
}

export function clean() {
    fs.rmSync(lib, { force: true, recursive: true })
}

export function finalize() {
    fs.renameSync(prodLib, jsLib)
}