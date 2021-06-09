import * as types from '../datatypes'
import * as exps from '../expressions'

import binaryen from 'binaryen'

export class Variable<A extends types.NumberArray> extends exps.Value<A> {

    constructor(type: types.Vector<A>, spread: boolean = false) {
        super(type, Variable.parameterTypes(type, spread))
    }

    private static parameterTypes<A extends types.NumberArray>(type: types.Vector<A>, spread: boolean) {
        if (spread && type.size > 1) {
            const parameterTypes = new Array<types.Vector<any>>(type.size)
            const parameterType = type.componentType == types.real ? types.scalar : types.discrete
            parameterTypes.fill(parameterType)
            return parameterTypes
        } else {
            return [type]
        }
    }

    private get isRef() {
        return this.type.size > 1 && this.parameterTypes.length == 1 
    }

    subExpressions(): exps.Expression[] {
        return []
    }
    
    calculate(): null {
        return null;
    }

    vectorExpression(module: binaryen.Module, variables: exps.FunctionLocals, parameters: exps.FunctionLocal[]): binaryen.ExpressionRef {
        return this.isRef ?
            parameters[0].get() :
            super.vectorExpression(module, variables, parameters)
    }

    vectorAssignment(module: binaryen.Module, variables: exps.FunctionLocals, parameters: exps.FunctionLocal[], resultRef: binaryen.ExpressionRef): binaryen.ExpressionRef {
        const ref = variables.declare(this.type.binaryenType)
        return this.isRef ?
            module.block(exps.newBlockName(), [
                module.memory.copy(ref.tee(resultRef), parameters[0].get(), module.i32.const(this.type.sizeInBytes)),
                ref.get()
            ], this.type.binaryenType) :
            super.vectorAssignment(module, variables, parameters, resultRef)
    }

    primitiveExpression(component: number, module: binaryen.Module, variables: exps.FunctionLocals, parameters: exps.FunctionLocal[]): binaryen.ExpressionRef {
        const [dataType, insType] = this.typeInfo(module)        
        return this.isRef ?
            insType.load(component * this.type.componentType.sizeInBytes, 0, parameters[0].get()) : 
            parameters[component].get()
    }

    static discrete() {
        return new Variable(types.discrete)
    }
    
    static scalar() {
        return new Variable(types.scalar)
    }
    
    static complex() {
        return new Variable(types.complex, false)
    }
    
    static spreadComplex() {
        return new Variable(types.complex, true)
    }
    
    static vectorOf<A extends types.NumberArray>(size: number, type: types.Primitive<A>) {
        return new Variable(types.vectorOf(size, type), false)
    }
    
    static spreadVectorOf<A extends types.NumberArray>(size: number, type: types.Primitive<A>) {
        return new Variable(types.vectorOf(size, type), true)
    }
    
}
