import { expect } from 'chai'
import { Literal } from '../../prod/values/literal'
import * as asm from '../../prod/assembler'
import * as rt from '../../prod/rt'
import * as types from '../../prod/datatypes'

type TestExports = {
    pi: () => number,
    five: () => number,
    complex: (ref: number) => number,
    vector: (ref: number) => number,
}

const assembler = new asm.Assembler([
    Literal.scalar(3.14).named("pi"),
    Literal.discrete(5).named("five"),
    Literal.complex(0.7, 0.5).named("complex"),
    Literal.vector(1.2, 2.3, 3.4).named("vector")        
])

console.log(assembler.textCode)

const rtModules = rt.initWaModulesFS("./out/rt")
const mem = notNull(rtModules.mem.exports, "Couldn't load Vibrato runtime!")
const test = assembler.exports<TestExports>(rtModules)

describe("Literal", () => {

    it("returns literal scalar values", () => {
        expect(test.pi()).to.equal(3.14)
    })

    it("returns literal discrete values", () => {
        expect(test.five()).to.equal(5)
    })

    it("returns literal complex values", () => {
        const ref = test.complex(mem.allocate64(2))
        const view = types.complex.view(mem.stack.buffer, ref)[0]
        expect(view.length).to.equal(2)
        expect(view[0]).to.equal(0.7)
        expect(view[1]).to.equal(0.5)
    })

    it("returns literal vector values", () => {
        const ref = test.vector(mem.allocate64(3))
        const view = types.vectorOf(3, types.real).view(mem.stack.buffer, ref)[0]
        expect(view.length).to.equal(3)
        expect(view[0]).to.equal(1.2)
        expect(view[1]).to.equal(2.3)
        expect(view[2]).to.equal(3.4)
    })

})

function notNull<T>(value: T | undefined, message: string): T {
    if (!value) {
        throw new Error(message)
    }
    return value
}
