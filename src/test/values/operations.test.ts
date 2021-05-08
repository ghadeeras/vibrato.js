import { expect } from 'chai'
import { Literal } from '../../prod/values/literal'
import { Add, ScalarMul, Dot } from '../../prod/values/operations'
import { Assembler } from '../../prod/assembler'
import { initWaModulesFS } from '../../prod/rt'
import { NumberArray, scalar } from '../../prod/datatypes'
import { Value } from '../../prod/expressions'

type TestExports = {
    fivePlusSeven: () => number,

    piPlusPhi: () => number,

    v1PlusV22D: () => number,
    v1PlusV23D: () => number,
    v1PlusV24D: () => number,
    v1PlusV2ND: () => number,

    v1ScalarMul2D: () => number,
    v1ScalarMul3D: () => number,
    v1ScalarMul4D: () => number,
    v1ScalarMulND: () => number,

    v1DotV22D: () => number,
    v1DotV23D: () => number,
    v1DotV24D: () => number,
    v1DotV2ND: () => number,
}

const five = Literal.discrete(5).named("five")
const seven = Literal.discrete(7).named("seven")
const fivePlusSeven = Add.of(five, seven).named("fivePlusSeven")

const pi = Literal.scalar(3.141).named("pi")
const phi = Literal.scalar(1.618).named("phi")
const piPlusPhi = Add.of(pi, phi).named("piPlusPhi")

const vector2D1 = Literal.vector(1.2, 2.3).named("vector2D1")
const vector2D2 = Literal.vector(3.2, -2.1).named("vector2D2")
const v1PlusV22D = Add.of(vector2D1, vector2D2).named("v1PlusV22D")
const v1ScalarMul2D = ScalarMul.of(vector2D1, pi).named("v1ScalarMul2D")
const v1DotV22D = Dot.of(vector2D1, vector2D2).named("v1DotV22D")

const vector3D1 = Literal.vector(1.2, 2.3, 3.4).named("vector3D1")
const vector3D2 = Literal.vector(3.4, -2.3, -1.2).named("vector3D2")
const v1PlusV23D = Add.of(vector3D1, vector3D2).named("v1PlusV23D")
const v1ScalarMul3D = ScalarMul.of(vector3D1, pi).named("v1ScalarMul3D")
const v1DotV23D = Dot.of(vector3D1, vector3D2).named("v1DotV23D")

const vector4D1 = Literal.vector(1.2, 2.3, 3.4, 4.5).named("vector4D1")
const vector4D2 = Literal.vector(3.4, -2.3, -1.2, 4.5).named("vector4D2")
const v1PlusV24D = Add.of(vector4D1, vector4D2).named("v1PlusV24D")
const v1ScalarMul4D = ScalarMul.of(vector4D1, pi).named("v1ScalarMul4D")
const v1DotV24D = Dot.of(vector4D1, vector4D2).named("v1DotV24D")

const vectorND1 = Literal.vector(1.2, 2.3, 3.4, 4.5, 5.6, 6.7, 7.8, 8.9).named("vectorND1")
const vectorND2 = Literal.vector(3.4, -6.7, 1.2, -4.5, 7.8, -2.3, 5.6, 8.9).named("vectorND2")
const v1PlusV2ND = Add.of(vectorND1, vectorND2).named("v1PlusV2ND")
const v1ScalarMulND = ScalarMul.of(vectorND1, pi).named("v1ScalarMulND")
const v1DotV2ND = Dot.of(vectorND1, vectorND2).named("v1DotV2ND")

const assembler = new Assembler([
    fivePlusSeven,

    piPlusPhi,

    v1PlusV22D,
    v1ScalarMul2D,
    v1DotV22D,

    v1PlusV23D,
    v1ScalarMul3D,
    v1DotV23D,

    v1PlusV24D,
    v1ScalarMul4D,
    v1DotV24D,

    v1PlusV2ND,
    v1ScalarMulND,
    v1DotV2ND
])

const rtModules = initWaModulesFS("./out/rt")
const mem = notNull(rtModules.mem.exports, "Couldn't load Vibrato runtime!")
const test = assembler.exports<TestExports>(rtModules)

describe("Operations", () => {

    describe("Add", () => {

        it("produces value of same type as operands", () => {
            expect(fivePlusSeven.type).to.deep.equal(five.type)
            expect(fivePlusSeven.type).to.deep.equal(seven.type)
            expect(piPlusPhi.type).to.deep.equal(pi.type)
            expect(piPlusPhi.type).to.deep.equal(phi.type)
            expect(v1PlusV22D.type).to.deep.equal(vector2D1.type)
            expect(v1PlusV22D.type).to.deep.equal(vector2D2.type)
            expect(v1PlusV23D.type).to.deep.equal(vector3D1.type)
            expect(v1PlusV23D.type).to.deep.equal(vector3D2.type)
            expect(v1PlusV24D.type).to.deep.equal(vector4D1.type)
            expect(v1PlusV24D.type).to.deep.equal(vector4D2.type)
            expect(v1PlusV2ND.type).to.deep.equal(vectorND1.type)
            expect(v1PlusV2ND.type).to.deep.equal(vectorND2.type)
        })

        it("rejects adding vectors of different sizes", () => {
            expect(() => Add.of(vector3D1, vectorND1)).to.throw()
        })
        
        it("calculates the addition of values", () => {
            expect(primitive(fivePlusSeven)).to.deep.equal(primitive(five) + primitive(seven))
            expect(primitive(piPlusPhi)).to.deep.equal(primitive(pi) + primitive(phi))
            vector(v1PlusV22D).forEach((c, i) => 
                expect(c).to.equal(component(vector2D1, i) + component(vector2D2, i))
            )
            vector(v1PlusV23D).forEach((c, i) => 
                expect(c).to.equal(component(vector3D1, i) + component(vector3D2, i))
            )
            vector(v1PlusV24D).forEach((c, i) => 
                expect(c).to.equal(component(vector4D1, i) + component(vector4D2, i))
            )
            vector(v1PlusV2ND).forEach((c, i) => 
                expect(c).to.equal(component(vectorND1, i) + component(vectorND2, i))
            )
        })

        it("generates the addition of values", () => {
            expect(test.fivePlusSeven()).to.equal(primitive(five) + primitive(seven))
            expect(test.piPlusPhi()).to.equal(primitive(pi) + primitive(phi))
            dereference(v1PlusV22D, test.v1PlusV22D()).forEach((c, i) => 
                expect(c).to.equal(component(vector2D1, i) + component(vector2D2, i))
            )
            dereference(v1PlusV23D, test.v1PlusV23D()).forEach((c, i) => 
                expect(c).to.equal(component(vector3D1, i) + component(vector3D2, i))
            )
            dereference(v1PlusV24D, test.v1PlusV24D()).forEach((c, i) => 
                expect(c).to.equal(component(vector4D1, i) + component(vector4D2, i))
            )
            dereference(v1PlusV2ND, test.v1PlusV2ND()).forEach((c, i) => 
                expect(c).to.equal(component(vectorND1, i) + component(vectorND2, i))
            )
        })

    })

    describe("ScalarMul", () => {

        it("produces value of same type as accumulator", () => {
            expect(v1ScalarMul2D.type).to.deep.equal(vector2D1.type)
            expect(v1ScalarMul3D.type).to.deep.equal(vector3D1.type)
            expect(v1ScalarMul4D.type).to.deep.equal(vector4D1.type)
            expect(v1ScalarMulND.type).to.deep.equal(vectorND1.type)
        })

        it("rejects non scalar operands", () => {
            expect(() => ScalarMul.of(vector3D1, vector3D2)).to.throw()
        })
        
        it("calculates scalar multiplication of values", () => {
            vector(v1ScalarMul2D).forEach((c, i) => 
                expect(c).to.equal(component(vector2D1, i) * primitive(pi))
            )
            vector(v1ScalarMul3D).forEach((c, i) => 
                expect(c).to.equal(component(vector3D1, i) * primitive(pi))
            )
            vector(v1ScalarMul4D).forEach((c, i) => 
                expect(c).to.equal(component(vector4D1, i) * primitive(pi))
            )
            vector(v1ScalarMulND).forEach((c, i) => 
                expect(c).to.equal(component(vectorND1, i) * primitive(pi))
            )
        })

        it("generates the scalar multiplication of values", () => {
            dereference(v1ScalarMul2D, test.v1ScalarMul2D()).forEach((c, i) => 
                expect(c).to.equal(component(vector2D1, i) * primitive(pi))
            )
            dereference(v1ScalarMul3D, test.v1ScalarMul3D()).forEach((c, i) => 
                expect(c).to.equal(component(vector3D1, i) * primitive(pi))
            )
            dereference(v1ScalarMul4D, test.v1ScalarMul4D()).forEach((c, i) => 
                expect(c).to.equal(component(vector4D1, i) * primitive(pi))
            )
            dereference(v1ScalarMulND, test.v1ScalarMulND()).forEach((c, i) => 
                expect(c).to.equal(component(vectorND1, i) * primitive(pi))
            )
        })

    })

    describe("Dot", () => {

        it("produces scalar value", () => {
            expect(v1DotV22D.type).to.deep.equal(scalar)
            expect(v1DotV23D.type).to.deep.equal(scalar)
            expect(v1DotV24D.type).to.deep.equal(scalar)
            expect(v1DotV2ND.type).to.deep.equal(scalar)
        })

        it("rejects operands of unequal size", () => {
            expect(() => Dot.of(vector3D1, vectorND2)).to.throw()
        })
        
        it("calculates and generates dot product of vectors", () => {
            expect(test.v1DotV22D()).to.equal(primitive(v1DotV22D))
            expect(test.v1DotV23D()).to.equal(primitive(v1DotV23D))
            expect(test.v1DotV24D()).to.equal(primitive(v1DotV24D))
            expect(test.v1DotV2ND()).to.equal(primitive(v1DotV2ND))
        })

    })

})

function primitive<T extends NumberArray>(vector: Value<T>) {
    return component(vector, 0)
}

function component<T extends NumberArray>(value: Value<T>, index: number) {
    return vector(value)[index]
}

function vector<T extends NumberArray>(value: Value<T>) {
    return notNull(value.get())
}

function dereference<T extends NumberArray>(value: Value<T>, ref: number) {
    return value.type.view(mem.stack.buffer, ref)[0]
}

function notNull<T>(value: T | null | undefined, message: string = "Cannot possibly be null"): T {
    if (!value) {
        throw new Error(message)
    }
    return value
}
