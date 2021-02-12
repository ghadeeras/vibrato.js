import * as types from '../datatypes'
import * as exps from '../expressions'

import binaryen from 'binaryen'

export class Literal<A extends types.NumberArray, S extends number> extends exps.Value<A, S> {

    private value: number[]

    private constructor(type: types.Vector<A, S>, value: number[]) {
        super(type)
        assert(() => `Expected ${type.size} vector components; found ${value.length}`, type.size == value.length)
        this.value = [...value]
    }
    
    calculate(): number[] {
        return this.value;
    }

    exports(): Record<string, string> {
        return {}
    }

    primitiveReference(component: number, module: binaryen.Module, dataType: binaryen.Type, instructionType: exps.BinaryenInstructionType): binaryen.ExpressionRef {
        return instructionType.const(this.value[component])
    }

    vectorDeclarations(module: binaryen.Module, dataType: binaryen.Type, instructionType: exps.BinaryenInstructionType): binaryen.FunctionRef[] {
        return []
    }

    primitiveDeclarations(module: binaryen.Module, dataType: binaryen.Type, instructionType: exps.BinaryenInstructionType): binaryen.FunctionRef[] {
        return []
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

