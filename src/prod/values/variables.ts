import * as types from '../datatypes'
import * as exps from '../expressions'

import binaryen from 'binaryen'

export class Variable<A extends types.NumberArray> extends exps.Value<A> {

    private constructor(type: types.Vector<A>) {
        super(type, Variable.parameterTypes(type))
    }

    private static parameterTypes<A extends types.NumberArray>(type: types.Vector<A>) {
        const parameterTypes = new Array<types.Vector<any>>(type.size)
        const parameterType = type.componentType == types.real ? types.scalar : types.discrete
        parameterTypes.fill(parameterType)
        return parameterTypes
    }

    subExpressions(): exps.Expression[] {
        return []
    }
    
    calculate(): null {
        return null;
    }

    primitiveExpression(component: number, module: binaryen.Module, variables: exps.FunctionLocals, parameters: exps.FunctionLocal[]): binaryen.ExpressionRef {
        return parameters[component].get()
    }

    static discrete() {
        return new Variable(types.discrete)
    }
    
    static scalar() {
        return new Variable(types.scalar)
    }
    
    static complex() {
        return new Variable(types.complex)
    }
    
    static vectorOf<A extends types.NumberArray>(size: number, type: types.Primitive<A>) {
        return new Variable(types.vectorOf(size, type))
    }
    
}
