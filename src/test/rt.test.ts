import { expect } from 'chai'
import * as rt from '../prod/rt'
import * as dt from '../prod/datatypes'

const rtModules = rt.initWaModulesFS("./out/rt")
const mem = notNull(rtModules.mem.exports, "Couldn't load Vibrato runtime 'mem' module !")
const space = notNull(rtModules.space.exports, "Couldn't load Vibrato runtime 'space' module!")

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

    describe("mem", () => {

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

    describe("space", () => {

        const vector2D = dt.vectorOf(2, dt.real)
        const vector3D = dt.vectorOf(3, dt.real)
        const vector4D = dt.vectorOf(4, dt.real)
        const vectorND = dt.vectorOf(randomInt(5, 64), dt.real)

        describe("add", () => {

            it("adds 2D real vector to another", () => {
                const [ref1, v1] = randomVector(vector2D)
                const [ref2, v2] = randomVector(vector2D)
    
                const ref = space.f64_vec2_add(ref1, ref2)
                const vector = vector2D.flatView(mem.stack.buffer, ref, 1)
    
                vector.forEach((v, i) => expect(v).to.equal(v1[i] + v2[i]))
            })

            it("adds 3D real vector to another", () => {
                const [ref1, v1] = randomVector(vector3D)
                const [ref2, v2] = randomVector(vector3D)
    
                const ref = space.f64_vec3_add(ref1, ref2)
                const vector = vector3D.flatView(mem.stack.buffer, ref, 1)
    
                vector.forEach((v, i) => expect(v).to.equal(v1[i] + v2[i]))
            })

            it("adds 4D real vector to another", () => {
                const [ref1, v1] = randomVector(vector4D)
                const [ref2, v2] = randomVector(vector4D)
    
                const ref = space.f64_vec4_add(ref1, ref2)
                const vector = vector4D.flatView(mem.stack.buffer, ref, 1)
    
                vector.forEach((v, i) => expect(v).to.equal(v1[i] + v2[i]))
            })

            it("adds ND real vector to another", () => {
                const [ref1, v1] = randomVector(vectorND)
                const [ref2, v2] = randomVector(vectorND)
    
                const ref = space.f64_vec_add(vectorND.size, ref1, ref2)
                const vector = vectorND.flatView(mem.stack.buffer, ref, 1)
    
                vector.forEach((v, i) => expect(v).to.equal(v1[i] + v2[i]))
            })

        })

    })

})

type Op = (v1: rt.Reference, v2: rt.Reference) => rt.Reference

function randomVector(vectorType: dt.Vector<Float64Array>): [rt.Reference, Float64Array] {
    const ref = mem.allocate64(vectorType.size)
    const vector = vectorType.flatView(mem.stack.buffer, ref, 1)
    randomize(vector)
    return [ref, vector]
}

function randomize(a: Float64Array) {
    for (let i = 0; i < a.length; i++) {
        a[i] = Math.random()
    }
}

function randomInt(min: number = 0, max: number = min + 100): number {
    return Math.round((max - min) * Math.random() + min)
}

function notNull<T>(value: T | undefined, message: string): T {
    if (!value) {
        throw new Error(message)
    }
    return value
}
