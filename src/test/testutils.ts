import { expect } from "chai";
import { Assembler } from "../prod/assembler.js";
import { NumberArray } from "../prod/datatypes.js";
import { Value, ValueExports, NamedValue } from "../prod/expressions.js"
import * as rt from "../prod/rt-node.js";

export function specificationsOf(description: string, specification: () => void) {
    context = new SpecContext(description, context)
    try {
        specification()
    } finally {
        if (context.parent == null) {
            context.createTests()
        }
        context = context.parent
    }
}

export function expectation<A extends NumberArray>(description: string, value: Value<A>, parameters: number[], predicate: (v: number[]) => boolean) {
    if (context == null) {
        throw new Error("No context is defined!")
    }

    const prefix = value instanceof NamedValue ? 
        context.id.replace("TST", value.name) : 
        context.id
    const id = `${prefix}_${context.expectations.length}`
    
    context.expectations.push({
        description: description,
        value: value.named(id, true),
        parameters: parameters,
        predicate: predicate
    })
}

export function deeplyEquals(value: number[] | Value<any>): (v: number[]) => boolean {
    return v => {
        expect(v).to.deep.equal(value instanceof Value ? value.get() : value);
        return true;
    };
}

let context: SpecContext | null = null

type Expectation<A extends NumberArray> = {
    description: string
    value: NamedValue<A>
    parameters: number[]
    predicate: (v: number[]) => boolean
}

class SpecContext {

    readonly id: string
    readonly subContexts: SpecContext[] = []
    readonly expectations: Expectation<NumberArray>[] = []

    constructor(readonly description: string, readonly parent: SpecContext | null) {
        if (parent != null) {
            this.id = `${parent.id}_${parent.subContexts.length}`
            parent.subContexts.push(this)
        } else {
            this.id = "TST"
        }
    }

    createTests() {
        const values = this.collectValues()
        const assembler = new Assembler(values)
        const runtime = rt.fsRuntime("./out/wa")
        const mem = notNull(runtime.exports.mem, "Couldn't load Vibrato runtime!")
        const test = assembler.exports<ValueExports>(runtime)

        this.doCreateTests(test, mem)
    }

    private collectValues(values: Value<NumberArray>[] = []) {
        for (let context of this.subContexts) {
            context.collectValues(values)
        }
        for (let expectation of this.expectations) {
            values.push(expectation.value)
        }
        return values
    }

    private doCreateTests(test: ValueExports, mem: rt.MemExports) {
        describe(this.description, () => {
            for (let context of this.subContexts) {
                context.doCreateTests(test, mem)
            }
            for (let expectation of this.expectations) {
                it(expectation.description, () => {
                    mem.enter()
                    const ref1 = expectation.value.evaluateVector(test, expectation.parameters)
                    const ref2 = mem.allocate64(expectation.value.type.size)
                    const ref3 = expectation.value.assignVector(test, ref2, expectation.parameters)
                    const actualValue0 = expectation.value.get()
                    const actualValue1 = [...expectation.value.type.view(mem.stack.buffer, ref1)[0]]
                    const actualValue2 = [...expectation.value.type.view(mem.stack.buffer, ref2)[0]]
                    const actualValue3 = []
                    for (let i = 0; i < expectation.value.type.size; i++) {
                        actualValue3.push(expectation.value.evaluateComponent(test, i, expectation.parameters))
                    }
                    if (actualValue0 != null) {
                        expect(actualValue0).to.satisfy(expectation.predicate)
                    }
                    expect(actualValue1).to.satisfy(expectation.predicate)
                    expect(actualValue2).to.satisfy(expectation.predicate)
                    expect(actualValue3).to.satisfy(expectation.predicate)
                    expect(ref3).to.equal(ref2)
                    mem.leave()
                })
            }
        })
    }

}

export function notNull<T>(value: T | undefined, message: string): T {
    if (!value) {
        throw new Error(message)
    }
    return value
}
