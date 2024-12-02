import fs from 'fs'
import binaryen from "binaryen"

const src = "./src"
const out = "./out"
const lib = "./lib"
const jsSrc = `${src}/prod/js`
const jsOut = `${out}/prod/js`
const waSrc = `${src}/prod/wa`
const waOut = `${out}/prod/wa`

export function compileRuntime() {
    console.log("Making sure runtime output directory exists ...")
    if (!fs.existsSync(waOut)) {
        fs.mkdirSync(waOut, { recursive: true })
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
        fs.writeFileSync(`${waOut}/${watFile.replace(".wat", ".wasm")}`, binary)
    }
}

export function clean() {
    console.log("Cleaning working directory ...")
    if (fs.existsSync(out)) {
        fs.rmSync(out, { force: true, recursive: true })
    }
    if (fs.existsSync(lib)) {
        fs.rmSync(lib, { force: true, recursive: true })
    }
}

export function finalize() {
    console.log("Finalizing package setup ...")
    fs.renameSync(`${out}/prod`, lib)
    fs.rmSync(out, { recursive: true })
    console.log("Success!")
}