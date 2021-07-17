import * as types from '../datatypes.js'
import * as exps from '../expressions.js'

import binaryen from 'binaryen'

abstract class Reduction<A extends types.NumberArray, B extends types.NumberArray> extends exps.Value<A> {

    protected constructor(protected name: string, protected accumulator: exps.Value<A>, protected operands: exps.Value<B>[]) {
        super(accumulator.type, Reduction.parameterTypes(accumulator, operands))
    }

    private static parameterTypes(accumulator: exps.Value<any>, operands: exps.Value<any>[]) {
        const types = [...accumulator.parameterTypes]
        for (let operand of operands) {
            types.push(...operand.parameterTypes)
        }
        return types
    }

    subExpressions(): exps.Expression[] {
        return[this.accumulator, ...this.operands]
    }

    calculate(): number[] | null {
        return this.operands.reduce((acc, operand) => {
            if (acc == null) {
                return null
            }
            const value = operand.get()
            return value != null ? this.preApply(value, acc) : null
        }, this.accumulator.get())
    }

    vectorAssignment(module: binaryen.Module, variables: exps.FunctionLocals, parameters: exps.FunctionLocal[], resultRef: binaryen.ExpressionRef): binaryen.ExpressionRef {
        const resultRefVar = variables.declare(binaryen.i32)
        const remainingParams = [...parameters] 
        return this.block(module, [
            resultRefVar.set(resultRef),
            this.operands.reduce((acc, operand) => {
                const operandParams = remainingParams.splice(0, operand.parameterTypes.length)
                return this.block(module, [
                    module.call("enter", [], binaryen.none),
                    module.call("return_i32", [this.applicationFunction(module, variables, operandParams, acc, operand, resultRefVar.get())], binaryen.i32)
                ])
            }, this.accumulator.vectorAssignment(module, variables, remainingParams.splice(0, this.accumulator.parameterTypes.length), resultRefVar.get()))
        ])
    }

    private applicationFunction(module: binaryen.Module, variables: exps.FunctionLocals, parameters: exps.FunctionLocal[], acc: number, operand: exps.Value<B>, resultRef: binaryen.ExpressionRef): number {
        const operandValue = operand.type.size > 1 || operand.type.size == this.type.size ?
            operand.vectorExpression(module, variables, parameters) :
            operand.primitiveExpression(0, module, variables, parameters)
        const result = resultRef
        switch (this.type.size) {
            case 2: return module.call(`f64_vec2_${this.name}_r`, [acc, operandValue, result], binaryen.i32) 
            case 3: return module.call(`f64_vec3_${this.name}_r`, [acc, operandValue, result], binaryen.i32)
            case 4: return module.call(`f64_vec4_${this.name}_r`, [acc, operandValue, result], binaryen.i32)
            default: return module.call(`f64_vec_${this.name}_r`, [module.i32.const(this.type.size), acc, operandValue, result], binaryen.i32)
        }
    }

    primitiveExpression(component: number, module: binaryen.Module, variables: exps.FunctionLocals, parameters: exps.FunctionLocal[]): binaryen.ExpressionRef {
        const [dataType, insType] = this.typeInfo(module)
        const remainingParams = [...parameters] 
        return this.operands.reduce((acc, operand) => {
            const operandParams = remainingParams.splice(0, operand.parameterTypes.length)
            const operandValue = operand.type.size > 1 ?
                operand.primitiveExpression(component, module, variables, operandParams) :
                operand.primitiveExpression(0, module, variables, operandParams)
            return this.applicationInstruction(module, insType)(acc, operandValue)
        }, this.accumulator.primitiveExpression(component, module, variables, remainingParams.splice(0, this.accumulator.parameterTypes.length)))
    }

    protected abstract preApply(acc: number[], value: number[]): number[]

    protected abstract applicationInstruction(module: binaryen.Module, instructionType: types.BinaryenInstructionType): (left: number, right: number) => number

}

abstract class Operation<A extends types.NumberArray> extends Reduction<A, A> {

    protected constructor(name: string, accumulator: exps.Value<A>, operands: exps.Value<A>[]) {
        super(name, accumulator, operands)
        for (let operand of operands) {
            assert(() => `Expected ${this.type.size} operand vector components; found ${operand.type.size}`, this.type.size == operand.type.size)
        }
    }

}

export class Add<A extends types.NumberArray> extends Operation<A> {

    private constructor(accumulator: exps.Value<A>, operands: exps.Value<A>[]) {
        super("add", accumulator, operands)
    }
    
    protected preApply(acc: number[], value: number[]): number[] {
        return acc.map((a, i) => a + value[i])
    }

    protected applicationInstruction(module: binaryen.Module, instructionType: types.BinaryenInstructionType): (left: number, right: number) => number {
        return instructionType.add
    }

    static of<A extends types.NumberArray>(firstOp: exps.Value<A>, ...restOps: exps.Value<A>[]) {
        return new Add(firstOp, restOps)
    }
    
}

export class Sub<A extends types.NumberArray> extends Operation<A> {

    private constructor(accumulator: exps.Value<A>, operands: exps.Value<A>[]) {
        super("sub", accumulator, operands)
    }
    
    protected preApply(acc: number[], value: number[]): number[] {
        return acc.map((a, i) => a - value[i])
    }

    protected applicationInstruction(module: binaryen.Module, instructionType: types.BinaryenInstructionType): (left: number, right: number) => number {
        return instructionType.sub
    }

    static of<A extends types.NumberArray>(firstOp: exps.Value<A>, ...restOps: exps.Value<A>[]) {
        return new Sub(firstOp, restOps)
    }
    
}

export class Mul<A extends types.NumberArray> extends Operation<A> {

    private constructor(accumulator: exps.Value<A>, operands: exps.Value<A>[]) {
        super("mul", accumulator, operands)
    }
    
    protected preApply(acc: number[], value: number[]): number[] {
        return acc.map((a, i) => a * value[i])
    }

    protected applicationInstruction(module: binaryen.Module, instructionType: types.BinaryenInstructionType): (left: number, right: number) => number {
        return instructionType.mul
    }

    static of<A extends types.NumberArray>(firstOp: exps.Value<A>, ...restOps: exps.Value<A>[]) {
        return new Mul(firstOp, restOps)
    }
    
}

export class Div extends Operation<Float64Array> {

    private constructor(accumulator: exps.Value<Float64Array>, operands: exps.Value<Float64Array>[]) {
        super("div", accumulator, operands)
    }
    
    protected preApply(acc: number[], value: number[]): number[] {
        return acc.map((a, i) => a / value[i])
    }

    protected applicationInstruction(module: binaryen.Module, instructionType: types.BinaryenInstructionType): (left: number, right: number) => number {
        return module.f64.div;
    }

    static of(firstOp: exps.Value<Float64Array>, ...restOps: exps.Value<Float64Array>[]) {
        return new Div(firstOp, restOps)
    }
    
}

export class ScalarMul<A extends types.NumberArray> extends Reduction<A, A> {

    private constructor(accumulator: exps.Value<A>, operands: exps.Value<A>[]) {
        super("scalar_mul", accumulator, operands)
        for (let operand of operands) {
            assert(() => `Expected primitive real operand; found vector of size ${operand.type.size}`, 1 == operand.type.size)
        }
    }
    
    protected preApply(acc: number[], value: number[]): number[] {
        return acc.map(a => a * value[0])
    }

    protected applicationInstruction(module: binaryen.Module, instructionType: types.BinaryenInstructionType): (left: number, right: number) => number {
        return instructionType.mul
    }

    static of<A extends types.NumberArray>(firstOp: exps.Value<A>, ...restOps: exps.Value<A>[]) {
        return new ScalarMul(firstOp, restOps)
    }
    
}

export class ScalarDiv extends Reduction<Float64Array, Float64Array> {

    private constructor(accumulator: exps.Value<Float64Array>, operands: exps.Value<Float64Array>[]) {
        super("scalar_div", accumulator, operands)
        for (let operand of operands) {
            assert(() => `Expected primitive real operand; found vector of size ${operand.type.size}`, 1 == operand.type.size)
        }
    }
    
    protected preApply(acc: number[], value: number[]): number[] {
        return acc.map(a => a / value[0])
    }

    protected applicationInstruction(module: binaryen.Module, instructionType: types.BinaryenInstructionType): (left: number, right: number) => number {
        return module.f64.div
    }

    static of(firstOp: exps.Value<Float64Array>, ...restOps: exps.Value<Float64Array>[]) {
        return new ScalarDiv(firstOp, restOps)
    }
    
}

export class Dot extends exps.Value<Float64Array> {

    protected constructor(protected left: exps.Value<Float64Array>, protected right: exps.Value<Float64Array>) {
        super(types.scalar, [...left.parameterTypes, ...right.parameterTypes])
        assert(
            () => `Expected left and right operands to be the same size; found ${left.type.size} and ${right.type.size} instead.`, 
            left.type.size == right.type.size
        )
    }

    subExpressions(): exps.Expression[] {
        return [this.left, this.right]
    }

    calculate(): number[] | null {
        const v1 = this.left.calculate()
        const v2 = this.right.calculate()
        return v1 != null && v2 != null ? 
            [v1.reduce((a, v1_i, i) => a + v1_i * v2[i], 0)] :
            null
    }

    primitiveExpression(component: number, module: binaryen.Module, variables: exps.FunctionLocals, parameters: exps.FunctionLocal[]): binaryen.ExpressionRef {
        return this.block(module, [
            module.call("enter", [], binaryen.none),
            module.call("return_f64", [this.applicationFunction(module, variables, parameters)], binaryen.f64)
        ])
    }

    private applicationFunction(module: binaryen.Module, variables: exps.FunctionLocals, parameters: exps.FunctionLocal[]): number {
        const leftValue = this.left.vectorExpression(module, variables, parameters.slice(0, this.left.parameterTypes.length))
        const rightValue = this.right.vectorExpression(module, variables, parameters.slice(this.left.parameterTypes.length))
        switch (this.left.type.size) {
            case 2: return module.call(`f64_vec2_dot`, [leftValue, rightValue], binaryen.f64) 
            case 3: return module.call(`f64_vec3_dot`, [leftValue, rightValue], binaryen.f64)
            case 4: return module.call(`f64_vec4_dot`, [leftValue, rightValue], binaryen.f64)
            default: return module.call(`f64_vec_dot`, [module.i32.const(this.left.type.size), leftValue, rightValue], binaryen.f64)
        }
    }

    static of(left: exps.Value<Float64Array>, right: exps.Value<Float64Array>): Dot {
        return new Dot(left, right);
    }

}

function assert(message: () => string, condition: boolean) {
    if (!condition) {
        throw new Error(message())
    }
}
