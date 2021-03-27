import * as types from '../datatypes'
import * as exps from '../expressions'

import binaryen from 'binaryen'

abstract class Operation<A extends types.NumberArray> extends exps.Value<A> implements exps.Function<exps.Value<A>, exps.Value<A>> {

    protected constructor(private name: string, type: types.Vector<A>, protected operands: exps.Value<A>[]) {
        super(type)
        assert(() => `Expected at least one operand; found ${operands.length}`, operands.length > 0)
        for (let operand of operands) {
            assert(() => `Expected ${type.size} operand vector components; found ${operand.type.size}`, type.size == operand.type.size)
        }
    }

    abstract apply(input: exps.Value<A>): exps.Value<A>
    
    calculate(): number[] | null {
        const [first, ...rest] = this.operands
        return rest.reduce((acc, op) => {
            if (acc == null) {
                return null
            }
            const value = op.get()
            return value != null ? this.preApply(value, acc) : null
        }, first.get())
    }

    vectorSubExpressions(module: binaryen.Module, variablesIndex: number, dataType: binaryen.Type, instructionType: exps.BinaryenInstructionType): binaryen.ExpressionRef[] {
        const [first, ...rest] = this.operands
        return [
            rest.reduce((acc, operand) => {
                return this.block(module, [
                    module.call("enter", [], binaryen.none),
                    module.drop(this.applicationFunction(module, acc, operand, variablesIndex, dataType, instructionType)),
                    module.call("leave", [], binaryen.none),
                    module.local.get(variablesIndex, binaryen.i32)
                ])
            }, first.vectorExpression(module, variablesIndex, dataType, instructionType))
        ]
    }

    private applicationFunction(module: binaryen.Module, acc: number, operand: exps.Value<A>, variablesIndex: number, dataType: number, instructionType: exps.BinaryenInstructionType): number {
        const operandValue = operand.vectorExpression(module, variablesIndex, dataType, instructionType)
        const result = module.local.get(variablesIndex, binaryen.i32)
        switch (this.type.size) {
            case 2: return module.call(`f64_vec2_${this.name}_r`, [acc, operandValue, result], binaryen.i32) 
            case 3: return module.call(`f64_vec3_${this.name}_r`, [acc, operandValue, result], binaryen.i32)
            case 4: return module.call(`f64_vec4_${this.name}_r`, [acc, operandValue, result], binaryen.i32)
            default: return module.call(`f64_vec_${this.name}_r`, [module.i32.const(this.type.size), acc, operandValue, result], binaryen.i32)
        }
    }

    primitiveExpression(component: number, module: binaryen.Module, variablesIndex: number, dataType: binaryen.Type, instructionType: exps.BinaryenInstructionType): binaryen.ExpressionRef {
        const [first, ...rest] = this.operands
        return rest.reduce((acc, operand) => {
            const operandValue = operand.primitiveExpression(component, module, variablesIndex, dataType, instructionType)
            return this.applicationInstruction(module, instructionType)(acc, operandValue)
        }, first.primitiveExpression(component, module, variablesIndex, dataType, instructionType))
    }

    protected abstract preApply(acc: number[], value: number[]): number[]

    protected abstract applicationInstruction(module: binaryen.Module, instructionType: exps.BinaryenInstructionType): (left: number, right: number) => number

}

export class Add<A extends types.NumberArray> extends Operation<A> {

    private constructor(type: types.Vector<A>, operands: exps.Value<A>[]) {
        super("add", type, operands)
    }
    
    apply(input: exps.Value<A>): exps.Value<A> {
        const [first, ...rest] = this.operands 
        return Add.add(first, ...rest, input)
    }

    protected preApply(acc: number[], value: number[]): number[] {
        return value.map((v, i) => acc[i] + v)
    }

    protected applicationInstruction(module: binaryen.Module, instructionType: exps.BinaryenInstructionType): (left: number, right: number) => number {
        return instructionType.add
    }

    static add<A extends types.NumberArray>(firstOp: exps.Value<A>, ...restOps: exps.Value<A>[]) {
        return new Add(firstOp.type, [firstOp, ...restOps])
    }
    
}

export class Sub<A extends types.NumberArray> extends Operation<A> {

    private constructor(type: types.Vector<A>, operands: exps.Value<A>[]) {
        super("sub", type, operands)
    }
    
    apply(input: exps.Value<A>): exps.Value<A> {
        const [first, ...rest] = this.operands 
        return Sub.sub(first, ...rest, input)
    }

    protected preApply(acc: number[], value: number[]): number[] {
        return value.map((v, i) => acc[i] - v)
    }

    protected applicationInstruction(module: binaryen.Module, instructionType: exps.BinaryenInstructionType): (left: number, right: number) => number {
        return instructionType.sub
    }

    static sub<A extends types.NumberArray>(firstOp: exps.Value<A>, ...restOps: exps.Value<A>[]) {
        return new Sub(firstOp.type, [firstOp, ...restOps])
    }
    
}

export class Mul<A extends types.NumberArray> extends Operation<A> {

    private constructor(type: types.Vector<A>, operands: exps.Value<A>[]) {
        super("mul", type, operands)
    }
    
    apply(input: exps.Value<A>): exps.Value<A> {
        const [first, ...rest] = this.operands 
        return Mul.mul(first, ...rest, input)
    }

    protected preApply(acc: number[], value: number[]): number[] {
        return value.map((v, i) => acc[i] - v)
    }

    protected applicationInstruction(module: binaryen.Module, instructionType: exps.BinaryenInstructionType): (left: number, right: number) => number {
        return instructionType.mul
    }

    static mul<A extends types.NumberArray>(firstOp: exps.Value<A>, ...restOps: exps.Value<A>[]) {
        return new Mul(firstOp.type, [firstOp, ...restOps])
    }
    
}

export class Div extends Operation<Float64Array> {

    private constructor(type: types.Vector<Float64Array>, operands: exps.Value<Float64Array>[]) {
        super("div", type, operands)
    }
    
    apply(input: exps.Value<Float64Array>): exps.Value<Float64Array> {
        const [first, ...rest] = this.operands 
        return Mul.mul(first, ...rest, input)
    }

    protected preApply(acc: number[], value: number[]): number[] {
        return value.map((v, i) => acc[i] - v)
    }

    protected applicationInstruction(module: binaryen.Module, instructionType: exps.BinaryenInstructionType): (left: number, right: number) => number {
        return module.f64.div
    }

    static div(firstOp: exps.Value<Float64Array>, ...restOps: exps.Value<Float64Array>[]) {
        return new Div(firstOp.type, [firstOp, ...restOps])
    }
    
}

function assert(message: () => string, condition: boolean) {
    if (!condition) {
        throw new Error(message())
    }
}

