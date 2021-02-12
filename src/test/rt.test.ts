import { expect } from 'chai'
import * as rt from '../prod/rt'

const rtModules = rt.initWaModulesFS("./out/rt")
const mem = notNull(rtModules.mem.exports, "Couldn't load Vibrato runtime!")

describe("Runtime", () => {

    let location = 0

    beforeEach(() => {
        mem.enter()
        location = mem.allocate8(randomInt()) - 4
    })

    afterEach(() => {
        mem.leave()
        expect(mem.allocate8(0)).to.equal(location)
    })

    describe("allocate8", () => {

        it("allocates specified number of bytes on the stack", () => {
            const size = randomInt(8)
            const ref1 = mem.allocate8(size)
            const ref2 = mem.allocate8(0)
            expect(ref1).to.be.gte(location)
            expect(ref2 - ref1).to.equal(size)
        })

    })

    describe("allocate16", () => {

        it("allocates specified number of 16-bit words on the stack", () => {
            const size = randomInt(8)
            const ref1 = mem.allocate16(size)
            const ref2 = mem.allocate16(0)
            expect(ref1).to.be.gte(location)
            expect(ref2 - ref1).to.equal(2 * size)
        })

        it("returns 2-byte aligned addresses", () => {
            for (let i = 0; i < 2; i++) {
                mem.allocate8(i)
                const ref = mem.allocate16(randomInt(8))
                expect(ref % 2).to.equal(0)
            }
        })

    })

    describe("allocate32", () => {

        it("allocates specified number of 32-bit words on the stack", () => {
            const size = randomInt(8)
            const ref1 = mem.allocate32(size)
            const ref2 = mem.allocate32(0)
            expect(ref1).to.be.gte(location)
            expect(ref2 - ref1).to.equal(4 * size)
        })

        it("returns 4-byte aligned addresses", () => {
            for (let i = 0; i < 4; i++) {
                mem.allocate8(i)
                const ref = mem.allocate32(randomInt(8))
                expect(ref % 4).to.equal(0)
            }
        })

    })

    describe("allocate64", () => {

        it("allocates specified number of 64-bit words on the stack", () => {
            const size = randomInt(8)
            const ref1 = mem.allocate64(size)
            const ref2 = mem.allocate64(0)
            expect(ref1).to.be.gte(location)
            expect(ref2 - ref1).to.equal(8 * size)
        })

        it("returns 8-byte aligned addresses", () => {
            for (let i = 0; i < 8; i++) {
                mem.allocate8(i)
                const ref = mem.allocate64(randomInt(8))
                expect(ref % 8).to.equal(0)
            }
        })

    })

})

function randomInt(min: number = 0, max: number = min + 100): number {
    return Math.round((max - min) * Math.random() + min)
}

function notNull<T>(value: T | undefined, message: string): T {
    if (!value) {
        throw new Error(message)
    }
    return value
}
