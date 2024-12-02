import * as types from './datatypes.js'
import * as rt from './rt.js'

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

export type ValueExports = Record<string, (...params: number[]) => number>

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
    private _parameterTypes: types.DataType<any>[]

    constructor(readonly type: types.DataType<A>, parameterTypes: types.DataType<any>[]) {
        this._parameterTypes = [...parameterTypes]
    }

    get parameterTypes() {
        return [...this._parameterTypes]
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

    expression(module: binaryen.Module, variables: FunctionLocals, parameters: FunctionLocal[]): binaryen.ExpressionRef {
        return this.type.size > 1 ? 
            this.vectorExpression(module, variables, parameters) :
            this.primitiveExpression(0, module, variables, parameters)
    }

    vectorExpression(module: binaryen.Module, variables: FunctionLocals, parameters: FunctionLocal[]): binaryen.ExpressionRef {
        return this.vectorAssignment(module, variables, parameters, this.allocateResultSpace(module))
    }

    vectorAssignment(module: binaryen.Module, variables: FunctionLocals, parameters: FunctionLocal[], resultRef: binaryen.ExpressionRef): binaryen.ExpressionRef {
        const [dataType, insType] = this.typeInfo(module)
        const resultRefVar = variables.declare(binaryen.i32)
        return this.block(module, [
            resultRefVar.set(resultRef),
            ...this.components(i => 
                insType.store(i * this.type.componentType.sizeInBytes, 0,
                    resultRefVar.get(),
                    this.primitiveExpression(i, module, variables, parameters)
                )
            ),
            resultRefVar.get()
        ])
    }

    abstract primitiveExpression(component: number, module: binaryen.Module, variables: FunctionLocals, parameters: FunctionLocal[]): binaryen.ExpressionRef

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

    protected checkParameters(parameters: FunctionLocal[]) {
        if (parameters.length != this._parameterTypes.length) {
            throw new Error(`Expected ${this._parameterTypes.length} parameters, got ${parameters.length} instead!`)
        }
        for (let i = 0; i < parameters.length; i++) {
            const parameter = parameters[i]
            const parameterType = this._parameterTypes[i]
            const [expectedType, expectedTypeName] = parameterType.size > 1 || parameterType.componentType == types.integer ?
                [binaryen.i32, "integer/reference"] :
                [binaryen.f64, "real"]
            if (parameter.type != expectedType) {
                throw new Error(`Expected ${expectedTypeName} for parameter ${i}, but was not!`)
            }            
        }
    }

    protected typeInfo(module: binaryen.Module): [binaryen.Type, types.BinaryenInstructionType] {
        return [
            this.type.componentType.binaryenType, 
            this.type.componentType.instructionType(module)
        ]
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
    
    readonly name: string 
    readonly isPublic: boolean 
    readonly signature: binaryen.Type[]

    constructor(private wrapped: Value<A>, name: string | null, private isTestValue: boolean = false) {
        super(wrapped.type, wrapped.parameterTypes)
        this.name = name ? name : newValueName()
        this.isPublic = name != null && !isTestValue
        this.signature = this.parameterTypes.map(parameterType => 
            parameterType.size > 1 || parameterType.componentType == types.integer ? binaryen.i32 : binaryen.f64
        )
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

    evaluate(exports: ValueExports, parameters: number[] = []): number {
        return exports[this.name](...parameters)
    }

    evaluateVector(exports: ValueExports, parameters: number[] = []): number {
        return exports[this.vectorName()](...parameters)
    }

    evaluateComponent(exports: ValueExports, component: number, parameters: number[] = []): number {
        return exports[this.primitiveName(component)](...parameters)
    }

    assignVector(exports: ValueExports, ref: number, parameters: number[] = []): number {
        return exports[this.vectorAssignmentName()](ref, ...parameters)
    }

    vectorExpression(module: binaryen.Module, variables: FunctionLocals, parameters: FunctionLocal[]): binaryen.ExpressionRef {
        return module.call(this.vectorName(), parameters.map(parameter => parameter.get()), binaryen.i32)
    }

    vectorAssignment(module: binaryen.Module, variables: FunctionLocals, parameters: FunctionLocal[], resultRef: binaryen.ExpressionRef): binaryen.ExpressionRef {
        return module.call(this.vectorAssignmentName(), [resultRef, ...parameters.map(parameter => parameter.get())], binaryen.i32)
    }

    primitiveExpression(component: number, module: binaryen.Module, variables: FunctionLocals, parameters: FunctionLocal[]): number {
        const [dataType, insType] = this.typeInfo(module)
        return module.call(this.primitiveName(component), parameters.map(parameter => parameter.get()), dataType)
    }

    functions(module: binaryen.Module): number[] {
        const [dataType, insType] = this.typeInfo(module)
        return [
            addFunction(module, this.vectorName(), this.signature, binaryen.i32, (params, variables) => 
                this.wrapped.vectorExpression(module, variables, params)
            ),
            addFunction(module, this.vectorAssignmentName(), [binaryen.i32, ...this.signature], binaryen.i32, (params, variables) => 
                this.wrapped.vectorAssignment(module, variables, params.slice(1), module.local.get(0, binaryen.i32))
            ),
            ...this.components(i => 
                addFunction(module, this.primitiveName(i), this.signature, dataType, (params, variables) => 
                    this.wrapped.primitiveExpression(i, module, variables, params)
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

export class Delay<A extends types.NumberArray> extends Value<A> {

    private readonly name: string
    private readonly value: Value<A>
    private readonly isPublic: boolean
    
    private nextValueRef: rt.Reference = -1
    private delayRef: rt.Reference = -1
    private delayBufferRef: rt.Reference = -1
    
    private constructor(name: string | null, readonly length: number, readonly type: types.DataType<A>, value: (d: Delay<A>) => Value<A>) {
        super(type, [types.discrete])
        this.name = name != null ? name : newDelayName()
        this.value = value(this)
        this.isPublic = name != null
        if (!type.assignableFrom(this.value.type)) {
            throw new Error("Incompatible types!")
        }
        if (this.value.parameterTypes.length > 0) {
            throw new Error("Parametrized values are not allowed as delay input!")
        }
    }

    static create<A extends types.NumberArray>(length: number, type: types.DataType<A>, value: (d: Delay<A>) => Value<A>) {
        return new Delay(null, length, type, value)
    }

    static createNamed<A extends types.NumberArray>(name: string, length: number, type: types.DataType<A>, value: (d: Delay<A>) => Value<A>) {
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
                insType.store(0, 0, module.i32.const(this.nextValueRef), this.value.expression(module, vars, []))
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
        return new Apply(this, [index])
    }

    clear(memory: WebAssembly.Memory) {
        this.type.flatView(memory.buffer, this.delayBufferRef, this.length * this.type.size).fill(0)
    }

    calculate(): number[] | null {
        return null
    }

    vectorExpression(module: binaryen.Module, variables: FunctionLocals, parameters: FunctionLocal[]): binaryen.ExpressionRef {
        return this.length > 1 ? 
            module.call("item_ref", [
                module.i32.const(this.delayReference), 
                parameters[0].get()
            ], binaryen.i32) :
            module.i32.const(this.delayBufferReference)
    }

    vectorAssignment(module: binaryen.Module, variables: FunctionLocals, parameters: FunctionLocal[], resultRef: binaryen.ExpressionRef): binaryen.ExpressionRef {
        const ref = variables.declare(this.type.binaryenType)
        return this.type.size > 1 ?
            module.block(newBlockName(), [
                module.memory.copy(ref.tee(resultRef), this.vectorExpression(module, variables, parameters), module.i32.const(this.type.sizeInBytes)),
                ref.get()
            ], this.type.binaryenType) :
            super.vectorAssignment(module, variables, parameters, resultRef)
    }

    primitiveExpression(component: number, module: binaryen.Module, variables: FunctionLocals, parameters: FunctionLocal[]): number {
        const [dataType, insType] = this.typeInfo(module)
        return insType.load(this.type.componentType.sizeInBytes * component, 0, this.vectorExpression(module, variables, parameters)) 
    }

}

export class Apply<A extends types.NumberArray> extends Value<A> {

    private parameters: Value<any>[]

    constructor(private value: Value<A>, parameters: (Value<any> | null)[]) {
        super(value.type, Apply.newParameterTypes(value.parameterTypes, parameters))
        this.parameters = Apply.newParameters(value.parameterTypes, parameters)
    }

    private static newParameterTypes(parameterTypes: types.DataType<any>[], parameters: (Value<any> | null)[]): types.DataType<any>[] {
        const newParameters = this.newParameters(parameterTypes, parameters)
        const result: types.DataType<any>[] = []
        for (let parameter of newParameters) {
            result.push(...parameter.parameterTypes)
        }
        return result; 
    }

    private static newParameters(parameterTypes: types.DataType<any>[], parameters: (Value<any> | null)[]): Value<any>[] {
        if (parameters.length != parameterTypes.length) {
            throw new Error(`Expected ${parameterTypes.length} parameters but found ${parameters.length}`)
        }
        const result: Value<any>[] = []
        for (let i = 0; i < parameterTypes.length; i++) {
            const parameterType = parameterTypes[i]
            const parameter = parameters[i] ?? new Variable(parameterType)
            if (!parameterType.assignableFrom(parameter.type)) {
                throw new Error(`Type mismatch for parameter at index ${i}!`)
            }
            result.push(parameter)
        }
        return result; 
    }

    subExpressions(): Expression[] {
        return [this.value, ...this.parameters
            .filter(parameter => parameter != null)
            .map(assertNotNull)
        ]
    }

    calculate(): number[] | null {
        return null
    }

    vectorExpression(module: binaryen.Module, variables: FunctionLocals, parameters: FunctionLocal[]): number {
        return this.doApply(module, variables, parameters, binaryen.i32, 
            valueParameters => this.value.vectorExpression(module, variables, valueParameters)
        )
    }

    vectorAssignment(module: binaryen.Module, variables: FunctionLocals, parameters: FunctionLocal[], resultRef: binaryen.ExpressionRef): number {
        return this.doApply(module, variables, parameters, binaryen.i32, 
            valueParameters => this.value.vectorAssignment(module, variables, valueParameters, resultRef)
        )
    }

    primitiveExpression(component: number, module: binaryen.Module, variables: FunctionLocals, parameters: FunctionLocal[]): number {
        return this.doApply(module, variables, parameters, this.value.type.componentType.binaryenType, 
            valueParameters => this.value.primitiveExpression(component, module, variables, valueParameters)
        )
    }

    private doApply(module: binaryen.Module, variables: FunctionLocals, parameters: FunctionLocal[], type: binaryen.Type, parametersApplier: (parameters: FunctionLocal[]) => binaryen.ExpressionRef): binaryen.ExpressionRef {
        const remainingParams = [...parameters]
        const valueParameters: FunctionLocal[] = []
        const assignments: binaryen.ExpressionRef[] = []
        for (let parameter of this.parameters) {
            const parameterParameters = remainingParams.splice(0, parameter.parameterTypes.length)
            const valueParameter = variables.declare(parameter.type.binaryenType)
            valueParameters.push(valueParameter)
            assignments.push(valueParameter.set(parameter.expression(module, variables, parameterParameters)))
        }
        return module.block(newBlockName(), [
            ...assignments,
            parametersApplier(valueParameters)
        ], type)
    }
    
}

export class Variable<A extends types.NumberArray> extends Value<A> {

    constructor(type: types.DataType<A>, spread: boolean = false) {
        super(type, Variable.parameterTypes(type, spread))
    }

    private static parameterTypes<A extends types.NumberArray>(type: types.DataType<A>, spread: boolean) {
        if (spread && type.size > 1) {
            const parameterTypes = new Array<types.DataType<any>>(type.size)
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

    subExpressions(): Expression[] {
        return []
    }
    
    calculate(): null {
        return null;
    }

    vectorExpression(module: binaryen.Module, variables: FunctionLocals, parameters: FunctionLocal[]): binaryen.ExpressionRef {
        return this.isRef ?
            parameters[0].get() :
            super.vectorExpression(module, variables, parameters)
    }

    vectorAssignment(module: binaryen.Module, variables: FunctionLocals, parameters: FunctionLocal[], resultRef: binaryen.ExpressionRef): binaryen.ExpressionRef {
        const ref = variables.declare(this.type.binaryenType)
        return this.isRef ?
            module.block(newBlockName(), [
                module.memory.copy(ref.tee(resultRef), parameters[0].get(), module.i32.const(this.type.sizeInBytes)),
                ref.get()
            ], this.type.binaryenType) :
            super.vectorAssignment(module, variables, parameters, resultRef)
    }

    primitiveExpression(component: number, module: binaryen.Module, variables: FunctionLocals, parameters: FunctionLocal[]): binaryen.ExpressionRef {
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

function assertNotNull(parameter: Value<any> | null) {
    if (parameter == null) {
        throw new Error("Could not be null here!")
    }
    return parameter
}

export interface StaticMemoryAllocator {

    declare<A extends types.NumberArray>(dataType: types.DataType<A>, initialValue: number[]): number

}

export class FunctionLocals {

    private readonly _locals: FunctionLocal[] = []

    constructor(readonly module: binaryen.Module) {
    }

    declare(type: binaryen.Type): FunctionLocal {
        const local = new FunctionLocal(this.module, type, this._locals.length)
        this._locals.push(local)
        return local
    }

    get locals(): FunctionLocal[] {
        return [...this._locals]
    }

    get localTypes(): binaryen.Type[] {
        return this._locals.map(local => local.type)
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
