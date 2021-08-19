import { expect } from 'chai'
import { Literal } from '../prod/values/literal'
import { Assembler } from '../prod/assembler'
import * as rt from '../prod/rt-node'
import * as dt from '../prod/datatypes'
import * as exps from '../prod/expressions'
import * as ops from '../prod/values/operations'
import * as utils from './testutils'

type TestExports = {
    discreteUnitDelay_1: () => number
    scalarUnitDelay_1: () => number
    vectorUnitDelay_1: () => number
    discreteDelay_1: () => number
    scalarDelay_1: () => number
    vectorDelay_1: () => number
    discreteDelay_8: () => number
    scalarDelay_8: () => number
    vectorDelay_8: () => number
    cycle: () => void
}

const discreteOne = Literal.discrete(1).named("discreteOne")
const scalarOne = Literal.scalar(1).named("scalarOne")
const vector = Literal.vector(1, 2, 3).named("vector")

const minus1 = Literal.discrete(-1)
const minus8 = Literal.discrete(-8)

const discreteUnitDelay = exps.Delay.createNamed("discreteUnitDelay", 1, discreteOne.type, d => 
    ops.Add.of(discreteOne, d.at(minus1))
)
const scalarUnitDelay = exps.Delay.createNamed("scalarUnitDelay", 1, scalarOne.type, d => 
    ops.Add.of(scalarOne, d.at(minus1))
)
const vectorUnitDelay = exps.Delay.createNamed("vectorUnitDelay", 1, vector.type, d => 
    ops.Add.of(vector, d.at(minus1))
)

const discreteDelay = exps.Delay.createNamed("discreteDelay", 8, discreteOne.type, d => 
    ops.Add.of(discreteOne, d.at(minus1))
)
const scalarDelay = exps.Delay.createNamed("scalarDelay", 8, scalarOne.type, d => 
    ops.Add.of(scalarOne, d.at(minus1))
)
const vectorDelay = exps.Delay.createNamed("vectorDelay", 8, vector.type, d => 
    ops.Add.of(vector, d.at(minus1))
)

const assembler = new Assembler([
    discreteUnitDelay.at(minus1).named("discreteUnitDelay_1"),
    scalarUnitDelay.at(minus1).named("scalarUnitDelay_1"),
    vectorUnitDelay.at(minus1).named("vectorUnitDelay_1"),
    discreteDelay.at(minus1).named("discreteDelay_1"),
    scalarDelay.at(minus1).named("scalarDelay_1"),
    vectorDelay.at(minus1).named("vectorDelay_1"),
    discreteDelay.at(minus8).named("discreteDelay_8"),
    scalarDelay.at(minus8).named("scalarDelay_8"),
    vectorDelay.at(minus8).named("vectorDelay_8")
])

const rtModules = rt.initWaModulesFS("./out/wa")
const mem = notNull(rtModules.mem.exports, "Couldn't load Vibrato runtime!")
const test = assembler.exports<TestExports>(rtModules)

describe("expressions", () => {

    describe("delay", () => {

        it("checks for type mismatch", () => {
            expect(() => exps.Delay.create(
                10, 
                dt.vectorOf(3, dt.real), 
                () => Literal.vector(1, 2, 3, 4)
            )).to.throw()

            expect(() => exps.Delay.create(
                10, 
                dt.complex, 
                () => Literal.vector(1, 2)
            )).to.throw()

            expect(() => exps.Delay.create(
                10, 
                dt.vectorOf(2, dt.real), 
                () => Literal.complex(1, 2)
            )).to.not.throw()
        })

        it("rejects parametrized values as input", () => {
            expect(() => exps.Delay.create(
                10, 
                dt.vectorOf(3, dt.real), 
                () => exps.Variable.spreadVectorOf(3, dt.real)
            )).to.throw()
        })

        it("delays signals", () => {

            for (let i = 0; i < 10; i++) {
                const j = Math.max(i - vectorDelay.length + 1, 0)
                printDelays()

                expect(test.discreteUnitDelay_1()).to.equal(i)
                expect(test.scalarUnitDelay_1()).to.equal(i)
                expect(dereference(vector.type, test.vectorUnitDelay_1())).to.deep.equal([i, 2 * i, 3 * i])
                expect(test.discreteDelay_1()).to.equal(i)
                expect(test.scalarDelay_1()).to.equal(i)
                expect(dereference(vector.type, test.vectorDelay_1())).to.deep.equal([i, 2 * i , 3 * i])
                expect(test.discreteDelay_8()).to.equal(j)
                expect(test.scalarDelay_8()).to.equal(j)
                expect(dereference(vector.type, test.vectorDelay_8())).to.deep.equal([j, 2 * j, 3 * j])

                test.cycle()
            }

        })

    })

})

utils.specificationsOf("Apply Operation", () => {

    const varVector = exps.Variable.vectorOf(3, dt.real)
    const varScalar = exps.Variable.scalar()
    const litVector = Literal.vector(4, 5, 6)
    const litScalar = Literal.scalar(3)
    const scaledVector = ops.ScalarMul.of(varVector, varScalar)

    utils.expectation(
        "Applies primitive and vector parameters", 
        new exps.Apply(scaledVector, [litVector, litScalar]).named("application"), 
        [], 
        utils.deeplyEquals([12, 15, 18])
    )

    utils.expectation(
        "Partially applies primitive and vector parameters (first param)", 
        new exps.Apply(scaledVector, [litVector, null]).named("partialApplication1"), 
        [3], 
        utils.deeplyEquals([12, 15, 18])
    )

    utils.expectation(
        "Partially applies primitive and vector parameters (last param)", 
        new exps.Apply(new exps.Apply(scaledVector, [null, litScalar]).named("partialApplication2"), [litVector]), 
        [], 
        utils.deeplyEquals([12, 15, 18])
    )

})

utils.specificationsOf("Variable", () => {

    utils.specificationsOf("vector", () => {

            const v = exps.Variable.spreadVectorOf(3, dt.real)
            const expectedResult = [3, 5, 7]
    
            utils.expectation("Uses parameters as components", v, [3, 5, 7], utils.deeplyEquals([3, 5, 7]))

    })

})

function dereference<T extends dt.NumberArray>(type: dt.Vector<T>, ref: number) {
    return [...type.view(mem.stack.buffer, ref)[0]]
}

function notNull<T>(value: T | undefined, message: string): T {
    if (!value) {
        throw new Error(message)
    }
    return value
}

function printDelays() {
    // printDelay("discreteUnitDelay", discreteUnitDelay)
    // printDelay("scalarUnitDelay", scalarUnitDelay)
    // printDelay("vectorUnitDelay", vectorUnitDelay)
    // printDelay("discreteDelay", discreteDelay)
    // printDelay("scalarDelay", scalarDelay)
    // printDelay("vectorDelay", vectorDelay)
    // console.log("")
}

function printDelay<A extends dt.NumberArray>(name: string, delay: exps.Delay<A>) {
    console.log(name + " = " + delay.type.flatView(mem.stack.buffer, delay.delayBufferReference, delay.length))
}

