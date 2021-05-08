import * as types from './datatypes'
import * as rt from './rt'

import binaryen from 'binaryen'

let sequenceBlocks = 0
let sequenceValues = 0
let sequenceDelays = 0

export function newBlockName(): string {
    return `_B_${sequenceBlocks++}`
}

export function newValueName(): string {
    return `_V_${sequenceValues++}`
}

export function newDelayName(): string {
    return `_D_${sequenceDelays++}`
}

export type BinaryenInstructionType = binaryen.Module["i32"] | binaryen.Module["f64"]

export type ValueExports = Record<string, (ref?: number) => number>

export interface Expression {

    subExpressions(): Expression[]

    memory(memoryAllocator: StaticMemoryAllocator): void

    functions(module: binaryen.Module): binaryen.FunctionRef[]

    read(module: binaryen.Module): binaryen.ExpressionRef[]

    write(module: binaryen.Module): binaryen.ExpressionRef[]

    exports(): Record<string, string>

}

export abstract class Value<A extends types.NumberArray> implements Expression {

    private calculated = false
    private cachedValue: number[] | null = null

    constructor(readonly type: types.Vector<A>) {
    }

    abstract subExpressions(): Expression[]

    named(name: string | null = null, isTestValue: boolean = false): NamedValue<A> {
        return new NamedValue(this, name, isTestValue)
    }
    
    delay(length: number): Delay<A> {
        return Delay.create(length, this.type, () => this)
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
        return this.vectorAssignment(module, variables, this.allocateResultSpace(module))
    }

    vectorAssignment(module: binaryen.Module, variables: FunctionLocals, resultRef: binaryen.ExpressionRef): binaryen.ExpressionRef {
        const [dataType, insType] = this.typeInfo(module)
        const resultRefVar = variables.declare(binaryen.i32)
        return this.block(module, [
            resultRefVar.set(resultRef),
            ...this.components(i => 
                insType.store(i * this.type.componentType.sizeInBytes, 0,
                    resultRefVar.get(),
                    this.primitiveExpression(i, module, variables)
                )
            ),
            resultRefVar.get()
        ])
    }

    abstract primitiveExpression(component: number, module: binaryen.Module, variables: FunctionLocals): binaryen.ExpressionRef

    memory(memoryAllocator: StaticMemoryAllocator): void {
    }

    functions(module: binaryen.Module): binaryen.FunctionRef[] {
        return []
    }

    read(module: binaryen.Module): binaryen.ExpressionRef[] {
        return []
    }

    write(module: binaryen.Module): binaryen.ExpressionRef[] {
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

export class NamedValue<A extends types.NumberArray> extends Value<A> {
    
    private readonly name: string 
    private readonly isPublic: boolean 

    constructor(private wrapped: Value<A>, name: string | null, private isTestValue: boolean = false) {
        super(wrapped.type)
        this.name = name ? name : newValueName()
        this.isPublic = name != null && !isTestValue
    }

    subExpressions(): Expression[] {
        return [this.wrapped]
    }

    calculate(): number[] | null {
        return this.wrapped.get()
    }

    exports(): Record<string, string> {
        return this.isPublic ? 
            this.publicExports() : 
            this.isTestValue ? 
                this.testExports() : 
                {}
    }

    private publicExports(): Record<string, string> {
        return {
            [this.name]: this.type.size > 1 ?
                this.vectorName() :
                this.primitiveName(0)
        }
    }

    private testExports(): Record<string, string> {
        const result: Record<string, string> = this.publicExports()
        result[this.vectorName()] = this.vectorName()
        result[this.vectorAssignmentName()] = this.vectorAssignmentName()
        for (let i = 0; i < this.type.size; i++) {
            result[this.primitiveName(i)] = this.primitiveName(i)
        }
        return result;
    }

    evaluate(exports: ValueExports): number {
        return exports[this.name]()
    }

    evaluateVector(exports: ValueExports): number {
        return exports[this.vectorName()]()
    }

    evaluateComponent(exports: ValueExports, component: number): number {
        return exports[this.primitiveName(component)]()
    }

    assignVector(exports: ValueExports, ref: number): number {
        return exports[this.vectorAssignmentName()](ref)
    }

    vectorExpression(module: binaryen.Module, variables: FunctionLocals): binaryen.ExpressionRef {
        return module.call(this.vectorName(), [], binaryen.i32)
    }

    vectorAssignment(module: binaryen.Module, variables: FunctionLocals, resultRef: binaryen.ExpressionRef): binaryen.ExpressionRef {
        return module.call(this.vectorAssignmentName(), [resultRef], binaryen.i32)
    }

    primitiveExpression(component: number, module: binaryen.Module, variables: FunctionLocals): number {
        const [dataType, insType] = this.typeInfo(module)
        return module.call(this.primitiveName(component), [], dataType)
    }

    functions(module: binaryen.Module): number[] {
        const [dataType, insType] = this.typeInfo(module)
        return [
            addFunction(module, this.vectorName(), [], binaryen.i32, (params, variables) => 
                this.wrapped.vectorExpression(module, variables)
            ),
            addFunction(module, this.vectorAssignmentName(), [binaryen.i32], binaryen.i32, (params, variables) => 
                this.wrapped.vectorAssignment(module, variables, module.local.get(0, binaryen.i32))
            ),
            ...this.components(i => 
                addFunction(module, this.primitiveName(i), [], dataType, (params, variables) => 
                    this.wrapped.primitiveExpression(i, module, variables)
                )
            )
        ]
    }
    
    private vectorName(): string {
        return `${this.name}_v`
    }

    private vectorAssignmentName(): string {
        return `${this.name}_r`
    }

    private primitiveName(component: number): string {
        return `${this.name}_${component}`
    }

}

export interface Function<I extends Expression, O extends Expression> extends Expression {

    apply(input: I): O

}

export class Delay<A extends types.NumberArray> implements Expression {

    private readonly name: string
    private readonly value: Value<A>
    private readonly isPublic: boolean
    
    private nextValueRef: rt.Reference = -1
    private delayRef: rt.Reference = -1
    private delayBufferRef: rt.Reference = -1
    
    private constructor(name: string | null, readonly length: number, readonly type: types.Vector<A>, value: (d: Delay<A>) => Value<A>) {
        this.name = name != null ? name : newDelayName()
        this.value = value(this)
        this.isPublic = name != null
        if (!type.assignableFrom(this.value.type)) {
            throw new Error("Incompatible types!")
        }
    }

    static create<A extends types.NumberArray>(length: number, type: types.Vector<A>, value: (d: Delay<A>) => Value<A>) {
        return new Delay(null, length, type, value)
    }

    static createNamed<A extends types.NumberArray>(name: string, length: number, type: types.Vector<A>, value: (d: Delay<A>) => Value<A>) {
        return new Delay(name, length, type, value)
    }

    private readerName(): string {
        return `${this.name}_read`
    }

    private writerName(): string {
        return `${this.name}_write`
    }

    get delayReference(): rt.Reference {
        return this.delayRef
    }

    get delayBufferReference(): rt.Reference {
        return this.delayBufferRef
    }

    memory(memoryAllocator: StaticMemoryAllocator): void {
        const bufferSize = this.length * this.type.size
        const headerType = types.vectorOf(6, types.integer)
        const bufferType = types.vectorOf(bufferSize, this.type.componentType)

        // Room for next value (scalar or reference). This also forces 64-bit alignment
        this.nextValueRef = memoryAllocator.declare(types.scalar, [0])
        
        this.delayRef = this.nextValueRef + types.scalar.sizeInBytes        
        this.delayBufferRef = this.length > 1 ? this.delayRef + headerType.sizeInBytes : this.delayRef

        if (this.length > 1) {
            // Adjacent room for delay header
            const delayRef = memoryAllocator.declare(headerType, [
                this.length,
                this.type.sizeInBytes, // Item size
                bufferType.sizeInBytes,
                this.delayBufferRef, // Buffer low bound (inclusive)
                this.delayBufferRef + bufferType.sizeInBytes, // Buffer high bound (exclusive)
                this.delayBufferRef // First item ref
            ])
            if (delayRef != this.delayRef) {
                throw new Error('Delay header memory allocation did not go as expected!')
            }
        }

        // Adjacent room for delay buffer
        const buffer = new Array<number>(bufferType.size)
        const delayBufferRef = memoryAllocator.declare(bufferType, buffer.fill(0))
        if (delayBufferRef != this.delayBufferRef) {
            throw new Error('Delay buffer memory allocation did not go as expected!')
        }
    }

    functions(module: binaryen.Module): binaryen.FunctionRef[] {
        const insType = this.type.size > 1 || this.type.componentType == types.integer ? module.i32 : module.f64
        const nextValue = insType.load(0, 0, module.i32.const(this.nextValueRef))
        const firstValueRef = this.length > 1 ? 
            module.call("rotate", [module.i32.const(this.delayRef)], binaryen.i32) :
            module.i32.const(this.delayBufferRef)
        return [
            addFunction(module, this.readerName(), [], binaryen.none, (params, vars) =>
                insType.store(0, 0, module.i32.const(this.nextValueRef), this.value.expression(module, vars))
            ),
            addFunction(module, this.writerName(), [], binaryen.none, (params, vars) =>
                this.type.size > 1 ? 
                    module.memory.copy(firstValueRef, nextValue, module.i32.const(this.type.sizeInBytes)) :
                    insType.store(0, 0, firstValueRef, nextValue)
            ),
        ]
    }

    read(module: binaryen.Module): binaryen.ExpressionRef[] {
        return [module.call(this.readerName(), [], binaryen.none)]
    }

    write(module: binaryen.Module): binaryen.ExpressionRef[] {
        return [module.call(this.writerName(), [], binaryen.none)]
    }

    exports(): Record<string, string> {
        return this.isPublic ? 
            { 
                [this.readerName()]: this.readerName(),
                [this.writerName()]: this.writerName(),
            } : {
            }
    }

    subExpressions(): Expression[] {
        return [this.value]
    }

    at(index: Value<Int32Array>): Value<A> {
        return new DelayValue(this, index)
    }

    clear(memory: WebAssembly.Memory) {
        this.type.flatView(memory.buffer, this.delayBufferRef, this.length * this.type.size).fill(0)
    }

}

class DelayValue<A extends types.NumberArray> extends Value<A> {

    constructor(readonly indexedDelay: Delay<A>, readonly index: Value<Int32Array>) {
        super(indexedDelay.type)
    }

    subExpressions(): Expression[] {
        return [this.indexedDelay, this.index]
    }

    calculate(): number[] | null {
        return null
    }

    vectorExpression(module: binaryen.Module, variables: FunctionLocals): binaryen.ExpressionRef {
        return this.indexedDelay.length > 1 ? 
            module.call("item_ref", [
                module.i32.const(this.indexedDelay.delayReference), 
                this.index.expression(module, variables)
            ], binaryen.i32) :
            module.i32.const(this.indexedDelay.delayBufferReference)
    }

    primitiveExpression(component: number, module: binaryen.Module, variables: FunctionLocals): number {
        const [dataType, insType] = this.typeInfo(module)
        return insType.load(this.type.componentType.sizeInBytes * component, 0, this.vectorExpression(module, variables)) 
    }

}

export interface StaticMemoryAllocator {

    declare<A extends types.NumberArray>(vector: types.Vector<A>, initialValue: number[]): number

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
