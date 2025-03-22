import fs from 'fs'

const out = "./out"
const lib = "./lib"

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