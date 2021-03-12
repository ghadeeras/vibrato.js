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

    reference(module: binaryen.Module, resultRef: binaryen.ExpressionRef | null = null): binaryen.ExpressionRef {
        const [dataType, insType] = this.typeInfo(module)
        return resultRef ?
                this.vectorReference(module, resultRef, dataType, insType) :
            this.type.size > 1 ? 
                this.vectorReference(module, this.allocateReference(module), dataType, insType) :
                this.primitiveReference(0, module, dataType, insType)
    }

    declarations(module: binaryen.Module): binaryen.FunctionRef[] {
        const [dataType, insType] = this.typeInfo(module)
        return this.type.size > 1 ?
            this.vectorDeclarations(module, dataType, insType) :
            this.primitiveDeclarations(module, dataType, insType)
    }

    vectorReference(module: binaryen.Module, resultRef: binaryen.ExpressionRef, dataType: binaryen.Type, instructionType: BinaryenInstructionType): binaryen.ExpressionRef {
        return this.block(module, [ 
            ...this.components(i => 
                instructionType.store(i * this.type.componentType.sizeInBytes, 0,
                    resultRef,
                    this.primitiveReference(i, module, dataType, instructionType)
                )
            ),
            resultRef
        ])
    }

    abstract calculate(): number[] | null

    abstract exports(): Record<string, string>

    abstract primitiveReference(component: number, module: binaryen.Module, dataType: binaryen.Type, instructionType: BinaryenInstructionType): binaryen.ExpressionRef

    vectorDeclarations(module: binaryen.Module, dataType: binaryen.Type, instructionType: BinaryenInstructionType): binaryen.FunctionRef[] {
        return []
    }

    primitiveDeclarations(module: binaryen.Module, dataType: binaryen.Type, instructionType: BinaryenInstructionType): binaryen.FunctionRef[] {
        return []
    }

    private typeInfo(module: binaryen.Module): [binaryen.Type, BinaryenInstructionType] {
        return this.type.componentType == types.integer ?
            [binaryen.i32, module.i32] :
            [binaryen.f64, module.f64]
    }

    protected allocateReference(module: binaryen.Module): binaryen.ExpressionRef {
        const functionName: keyof rt.MemExports = this.type.componentType == types.integer ? "allocate32" : "allocate64"
        return module.call(functionName, [module.i32.const(this.type.size)], binaryen.i32)
    }

    protected block(module: binaryen.Module, expressions: binaryen.ExpressionRef[]) {
        const label = newBlockName()
        return expressions.length > 1 ? module.block(label, expressions, binaryen.i32) : expressions[0]
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
        return { 
            [this.name] : this.type.size > 1 ? 
                this.vectorName() : 
                this.primitiveName(0) 
        }
    }

    vectorReference(module: binaryen.Module, resultRef: binaryen.ExpressionRef, dataType: binaryen.Type, instructionType: BinaryenInstructionType): binaryen.ExpressionRef {
        return module.call(this.vectorName(), [resultRef], resultRef)
    }

    primitiveReference(component: number, module: binaryen.Module, dataType: number, instructionType: BinaryenInstructionType): number {
        return module.call(this.primitiveName(component), [], dataType)
    }

    vectorDeclarations(module: binaryen.Module, dataType: number, instructionType: BinaryenInstructionType): number[] {
        return [
            module.addFunction(this.vectorName(), binaryen.createType([binaryen.i32]), binaryen.i32, [], 
                this.wrapped.vectorReference(module, module.local.get(0, binaryen.i32), dataType, instructionType)
            )
        ]
    }

    primitiveDeclarations(module: binaryen.Module, dataType: number, instructionType: BinaryenInstructionType): number[] {
        return [...this.components(i => 
            module.addFunction(this.primitiveName(i), binaryen.createType([]), dataType, [], 
                this.wrapped.primitiveReference(i, module, dataType, instructionType)
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
