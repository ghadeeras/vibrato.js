import * as types from './datatypes'
import * as rt from './rt'

import binaryen from 'binaryen'

let sequenceBlocks = 0
let sequenceValues = 0

export function newBlockName(): string {
    return `_B_${sequenceBlocks++}`
}

export function newValueName(): string {
    return `_V_${sequenceValues++}`
}

export type BinaryenInstructionType = binaryen.Module["i32"] | binaryen.Module["f64"]

export interface Expression {
}

export abstract class Value<A extends types.NumberArray> implements Expression {

    private calculated = false
    private cachedValue: number[] | null = null

    constructor(readonly type: types.Vector<A>) {
    }

    named(name: string | null = null): Value<A> {
        return new NamedValue(this, name)
    }
    
    delay<L extends number>(length: L): Delay<A> {
        throw new Error('Method not implemented.');
    }

    get(): number[] | null {
        if (!this.calculated) {
            this.cachedValue = this.calculate()
            this.calculated = true
        }
        return this.cachedValue ? [...this.cachedValue] : this.cachedValue
    }

    abstract calculate(): number[] | null

    exports(): Record<string, string> {
        return {}
    }

    expression(module: binaryen.Module, variables: FunctionLocals): binaryen.ExpressionRef {
        return this.type.size > 1 ? 
            this.vectorExpression(module, variables) :
            this.primitiveExpression(0, module, variables)
    }

    vectorExpression(module: binaryen.Module, variables: FunctionLocals): binaryen.ExpressionRef {
        const resultRef = variables.declare(binaryen.i32) 
        return this.block(module, [
            resultRef.set(this.allocateResultSpace(module)),
            ...this.vectorSubExpressions(module, resultRef, variables),
            resultRef.get()
        ])
    }

    vectorSubExpressions(module: binaryen.Module, resultRef: FunctionLocal, variables: FunctionLocals): binaryen.ExpressionRef[] {
        const [dataType, insType] = this.typeInfo(module)
        return [...this.components(i => 
            insType.store(i * this.type.componentType.sizeInBytes, 0,
                resultRef.get(),
                this.primitiveExpression(i, module, variables)
            )
        )]
    }

    abstract primitiveExpression(component: number, module: binaryen.Module, variables: FunctionLocals): binaryen.ExpressionRef

    functions(module: binaryen.Module): binaryen.FunctionRef[] {
        return [
            ...this.vectorFunctions(module),
            ...this.primitiveFunctions(module)
        ]
    }

    vectorFunctions(module: binaryen.Module): binaryen.FunctionRef[] {
        return []
    }

    primitiveFunctions(module: binaryen.Module): binaryen.FunctionRef[] {
        return []
    }

    protected typeInfo(module: binaryen.Module): [binaryen.Type, BinaryenInstructionType] {
        return this.type.componentType == types.integer ?
            [binaryen.i32, module.i32] :
            [binaryen.f64, module.f64]
    }

    protected allocateResultSpace(module: binaryen.Module): binaryen.ExpressionRef {
        const functionName: keyof rt.MemExports = this.type.componentType == types.integer ? "allocate32" : "allocate64"
        return module.call(functionName, [module.i32.const(this.type.size)], binaryen.i32)
    }

    protected block(module: binaryen.Module, expressions: binaryen.ExpressionRef[]) {
        const label = newBlockName()
        return expressions.length > 1 ? 
            module.block(label, expressions, binaryen.getExpressionType(expressions[expressions.length - 1])) : 
            expressions[0]
    }
    
    protected *components<T>(mapper: (component: number) => T) {
        for (let i = 0; i < this.type.size; i++) {
            yield mapper(i)
        }
    }
    
}

export class NamedValue<A extends types.NumberArray, S extends number> extends Value<A> {
    
    private readonly name: string 
    private readonly isPublic: boolean 

    constructor(private wrapped: Value<A>, name: string | null) {
        super(wrapped.type)
        this.name = name ? name : newValueName()
        this.isPublic = name != null
    }

    calculate(): number[] | null {
        return this.wrapped.get()
    }

    exports(): Record<string, string> {
        return this.isPublic ? { 
            [this.name] : this.type.size > 1 ? 
                this.vectorName() : 
                this.primitiveName(0) 
        } : {}
    }

    vectorExpression(module: binaryen.Module, variables: FunctionLocals): binaryen.ExpressionRef {
        return module.call(this.vectorName(), [], binaryen.i32)
    }

    primitiveExpression(component: number, module: binaryen.Module, variables: FunctionLocals): number {
        const [dataType, insType] = this.typeInfo(module)
        return module.call(this.primitiveName(component), [], dataType)
    }

    vectorFunctions(module: binaryen.Module): number[] {
        return [
            addFunction(module, this.vectorName(), [], binaryen.i32, (params, variables) => 
                this.wrapped.vectorExpression(module, variables)
            )
        ]
    }

    primitiveFunctions(module: binaryen.Module): number[] {
        const [dataType, insType] = this.typeInfo(module)
        return [...this.components(i => 
            addFunction(module, this.primitiveName(i), [], dataType, (params, variables) => 
                this.wrapped.primitiveExpression(i, module, variables)
            )
        )]
    }
    
    private vectorName(): string {
        return `${this.name}_v`
    }

    private primitiveName(component: number): string {
        return `${this.name}_${component}`
    }

}

export interface Function<I extends Expression, O extends Expression> extends Expression {

    apply(input: I): O

}

export interface Delay<A extends types.NumberArray> extends Expression {

    length: number

    value: Value<A>

    at(index: Value<Int32Array>): Value<A>

}

export class FunctionLocals {

    readonly locals: FunctionLocal[] = []

    constructor(readonly module: binaryen.Module) {
    }

    declare(type: binaryen.Type): FunctionLocal {
        const local = new FunctionLocal(this.module, type, this.locals.length)
        this.locals.push(local)
        return local
    }

    get localTypes(): binaryen.Type[] {
        return this.locals.map(local => local.type)
    } 

}

export class FunctionLocal {

    constructor(readonly module: binaryen.Module, readonly type: binaryen.Type, readonly index: number) {
    }

    get(): binaryen.ExpressionRef {
        return this.module.local.get(this.index, this.type)
    }

    set(value: number): binaryen.ExpressionRef {
        return this.module.local.set(this.index, value)
    }

    tee(value: number): binaryen.ExpressionRef {
        return this.module.local.tee(this.index, value, this.type)
    }

}

export function addFunction(
    module: binaryen.Module, 
    name: string,
    signature: binaryen.Type[], 
    returnType: binaryen.Type, 
    bodyBuilder: (params: FunctionLocal[], variables: FunctionLocals) => binaryen.ExpressionRef
) {
    const locals = new FunctionLocals(module)
    const params = signature.map(type => locals.declare(type))
    const body = bodyBuilder(params, locals)
    return module.addFunction(
        name, 
        binaryen.createType(signature), 
        returnType, 
        locals.localTypes.slice(params.length), 
        body
    )
}
