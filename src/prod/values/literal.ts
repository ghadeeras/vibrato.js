import * as types from '../datatypes.js'
import * as exps from '../expressions.js'

import binaryen from 'binaryen'

export class Literal<A extends types.NumberArray> extends exps.Value<A> {

    private value: number[]
    private pointer: number | null = null

    private constructor(type: types.Vector<A>, value: number[]) {
        super(type, [])
        assert(() => `Expected ${type.size} vector components; found ${value.length}`, type.size == value.length)
        this.value = [...value]
    }

    subExpressions(): exps.Expression[] {
        return []
    }
    
    calculate(): number[] {
        return this.value;
    }

    memory(memoryAllocator: exps.StaticMemoryAllocator): void {
        if (this.type.size > 1) {
            this.pointer = memoryAllocator.declare(this.type, this.value)
        }
    }

    vectorExpression(module: binaryen.Module, variables: exps.FunctionLocals, parameters: exps.FunctionLocal[]): binaryen.ExpressionRef {
        return this.pointer != null ?
            module.i32.const(this.pointer) :
            super.vectorExpression(module, variables, parameters)
    }

    primitiveExpression(component: number, module: binaryen.Module, variables: exps.FunctionLocals, parameters: exps.FunctionLocal[]): binaryen.ExpressionRef {
        const [dataType, insType] = this.typeInfo(module)
        return insType.const(this.value[component])
    }

    static discrete(value: number) {
        return new Literal(types.discrete, [value])
    }
    
    static scalar(value: number) {
        return new Literal(types.scalar, [value])
    }
    
    static complex(real: number, imaginary: number) {
        return new Literal(types.complex, [real, imaginary])
    }
    
    static vector(...components: number[]) {
        return new Literal(types.vectorOf(components.length, types.real), components)
    }
    
}

function assert(message: () => string, condition: boolean) {
    if (!condition) {
        throw new Error(message())
    }
}

