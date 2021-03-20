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

    abstract exports(): Record<string, string>

    expression(module: binaryen.Module, variablesIndex: number = 0): binaryen.ExpressionRef {
        const [dataType, insType] = this.typeInfo(module)
        return this.type.size > 1 ? 
            this.vectorExpression(module, variablesIndex, dataType, insType) :
            this.primitiveExpression(0, module, variablesIndex, dataType, insType)
    }

    vectorExpression(module: binaryen.Module, variablesIndex: number, dataType: binaryen.Type, instructionType: BinaryenInstructionType): binaryen.ExpressionRef {
        return this.block(module, [
            module.local.set(variablesIndex, this.allocateResultSpace(module)),
            ...this.vectorSubExpressions(module, variablesIndex, dataType, instructionType),
            module.local.get(variablesIndex, binaryen.i32)
        ])
    }

    vectorSubExpressions(module: binaryen.Module, variablesIndex: number, dataType: binaryen.Type, instructionType: BinaryenInstructionType): binaryen.ExpressionRef[] {
        return [...this.components(i => 
            instructionType.store(i * this.type.componentType.sizeInBytes, 0,
                module.local.get(variablesIndex, binaryen.i32),
                this.primitiveExpression(i, module, variablesIndex, dataType, instructionType)
            )
        )]
    }

    abstract primitiveExpression(component: number, module: binaryen.Module, variablesIndex: number, dataType: binaryen.Type, instructionType: BinaryenInstructionType): binaryen.ExpressionRef

    variables(): binaryen.Type[] {
        return this.type.size > 1 ?
            this.vectorExpressionVariables() :
            this.primitiveExpressionVariables()
    }

    vectorExpressionVariables(): binaryen.Type[] {
        return [binaryen.i32]
    }

    primitiveExpressionVariables(): binaryen.Type[] {
        return []
    }

    functions(module: binaryen.Module): binaryen.FunctionRef[] {
        const [dataType, insType] = this.typeInfo(module)
        return this.type.size > 1 ?
            this.vectorFunctions(module, dataType, insType) :
            this.primitiveFunctions(module, dataType, insType)
    }

    vectorFunctions(module: binaryen.Module, dataType: binaryen.Type, instructionType: BinaryenInstructionType): binaryen.FunctionRef[] {
        return []
    }

    primitiveFunctions(module: binaryen.Module, dataType: binaryen.Type, instructionType: BinaryenInstructionType): binaryen.FunctionRef[] {
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

    vectorExpressionVariables(): binaryen.Type[] {
        return []
    }

    vectorExpression(module: binaryen.Module, variablesIndex: binaryen.ExpressionRef, dataType: binaryen.Type, instructionType: BinaryenInstructionType): binaryen.ExpressionRef {
        return module.call(this.vectorName(), [], binaryen.i32)
    }

    primitiveExpression(component: number, module: binaryen.Module, variablesIndex: number, dataType: number, instructionType: BinaryenInstructionType): number {
        return module.call(this.primitiveName(component), [], dataType)
    }

    vectorFunctions(module: binaryen.Module, dataType: number, instructionType: BinaryenInstructionType): number[] {
        return [
            module.addFunction(this.vectorName(), binaryen.createType([]), binaryen.i32, this.wrapped.vectorExpressionVariables(), 
                this.wrapped.vectorExpression(module, 0, dataType, instructionType)
            )
        ]
    }

    primitiveFunctions(module: binaryen.Module, dataType: number, instructionType: BinaryenInstructionType): number[] {
        return [...this.components(i => 
            module.addFunction(this.primitiveName(i), binaryen.createType([]), dataType, [], 
                this.wrapped.primitiveExpression(i, module, 0, dataType, instructionType)
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
