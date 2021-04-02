import * as types from '../datatypes'
import * as exps from '../expressions'

import binaryen from 'binaryen'

export class Literal<A extends types.NumberArray> extends exps.Value<A> {

    private value: number[]

    private constructor(type: types.Vector<A>, value: number[]) {
        super(type)
        assert(() => `Expected ${type.size} vector components; found ${value.length}`, type.size == value.length)
        this.value = [...value]
    }
    
    calculate(): number[] {
        return this.value;
    }

    primitiveExpression(component: number, module: binaryen.Module, variables: exps.FunctionLocals): binaryen.ExpressionRef {
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

