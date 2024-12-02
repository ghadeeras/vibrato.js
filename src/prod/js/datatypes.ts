import binaryen from "binaryen"

export type Case<T, A, B> = T extends A ? B : never

export type NumberArray = Int32Array | Float64Array

export type PrimitiveSize<A extends NumberArray> = 
      Case<A, Int32Array, 4> 
    | Case<A, Float64Array, 8>

export type PrimitiveName<A extends NumberArray> = 
      Case<A, Int32Array, "integer"> 
    | Case<A, Float64Array, "real">

export type BinaryenInstructionType = binaryen.Module["i32"] | binaryen.Module["f64"]

export interface RawView {

    get(byteOffset: number): number

    set(byteOffset: number, value: number): RawView

}

export interface Primitive<A extends NumberArray> {

    readonly name: PrimitiveName<A>
    
    readonly sizeInBytes: PrimitiveSize<A>

    readonly binaryenType: binaryen.Type

    instructionType(module: binaryen.Module): BinaryenInstructionType

    view(buffer: ArrayBuffer, byteOffset?: number, length?: number): A

    rawView(buffer: ArrayBuffer, byteOffset?: number): RawView

}

export interface DataType<A extends NumberArray> {

    readonly componentType: Primitive<A>
    
    readonly size: number

    readonly sizeInBytes: number

    readonly binaryenType: binaryen.Type

    instructionType(module: binaryen.Module): BinaryenInstructionType

    view(buffer: ArrayBuffer, byteOffset?: number, length?: number): A[]

    flatView(buffer: ArrayBuffer, byteOffset?: number, length?: number): A

    buffer(array: number[]): ArrayBuffer

    assignableFrom<T extends DataType<A>>(dataType: T): boolean

    asVector(): Vector<A>

    asArray(): DataArray<A, any>

}

export interface Vector<A extends NumberArray> extends DataType<A> {
}

export interface DataArray<A extends NumberArray, T extends DataType<A>> extends DataType<A> {

    readonly itemType: T

    readonly length: number

}

class GenericRawView implements RawView {

    private view: DataView
    
    constructor(
        buffer: ArrayBuffer, 
        offset: number, 
        private getter: (dv: DataView, bo: number) => number, 
        private setter: (dv: DataView, bo: number, v: number) => void
    ) {
        this.view = new DataView(buffer, offset)
    }

    get(byteOffset: number): number {
        return this.getter(this.view, byteOffset)
    }

    set(byteOffset: number, value: number): RawView {
        this.setter(this.view, byteOffset, value)
        return this
    }

}

export class Integer implements Primitive<Int32Array> {

    readonly name = "integer"

    readonly sizeInBytes = 4

    readonly binaryenType = binaryen.i32

    private constructor() {
    }
    
    instructionType(module: binaryen.Module) {
        return module.i32
    }
    
    view(buffer: ArrayBuffer, byteOffset: number = 0, length: number = 1): Int32Array {
        return new Int32Array(buffer, byteOffset, length)
    }

    rawView(buffer: ArrayBuffer, byteOffset: number = 0): RawView {
        return new GenericRawView(buffer, byteOffset, 
            (dv, bo) => dv.getInt32(bo), 
            (dv, bo, v) => dv.setInt32(bo, v)
        )
    }

    static readonly type = new Integer()

}

export class Real implements Primitive<Float64Array> {

    readonly name = "real"

    readonly sizeInBytes = 8
    
    readonly binaryenType = binaryen.f64

    private constructor() {
    }
    
    instructionType(module: binaryen.Module) {
        return module.f64
    }
    
    view(buffer: ArrayBuffer, byteOffset: number = 0, length: number = 1): Float64Array {
        return new Float64Array(buffer, byteOffset, length)
    }

    rawView(buffer: ArrayBuffer, byteOffset: number = 0): RawView {
        return new GenericRawView(buffer, byteOffset, 
            (dv, bo) => dv.getFloat64(bo), 
            (dv, bo, v) => dv.setFloat64(bo, v)
        )
    }

    static readonly type = new Real()

}

export const integer = Integer.type
export const real = Real.type

abstract class GenericDataType<A extends NumberArray> implements DataType<A> {
    
    readonly sizeInBytes: number
    readonly binaryenType: binaryen.Type

    constructor(readonly componentType: Primitive<A>, readonly size: number) {
        this.sizeInBytes = componentType.sizeInBytes * size
        this.binaryenType = size > 1 ? binaryen.i32 : componentType.binaryenType 
    }

    abstract asVector(): Vector<A>
    abstract asArray(): DataArray<A, any>

    instructionType(module: binaryen.Module) {
        return this.size > 1 ? module.i32 : this.componentType.instructionType(module)
    }
    
    view(buffer: ArrayBuffer, byteOffset: number = 0, length: number = 1): A[] {
        const result: A[] = []
        for (let o = byteOffset; length-- > 0; o += this.componentType.sizeInBytes) {
            result.push(this.componentType.view(buffer, o, this.size))
        }
        return result
    }

    flatView(buffer: ArrayBuffer, byteOffset: number = 0, length: number = 1): A {
        return this.componentType.view(buffer, byteOffset, length * this.size)
    }

    buffer(array: number[]): ArrayBuffer {
        if (array.length % this.size != 0) {
            throw new Error(`Invalid array length! Expected multiples of ${this.size}; got ${array.length} instead!`);
        }
        const result = new ArrayBuffer(array.length * this.componentType.sizeInBytes)
        const view = this.flatView(result)
        for (let i = 0; i < array.length; i++) {
            view[i] = array[i]
        }
        return result
    }

    assignableFrom<T extends DataType<A>>(dataType: T): boolean {
        return dataType instanceof this.constructor && dataType.size == this.size && dataType.componentType === this.componentType
    }

}

class GenericVector<A extends NumberArray> extends GenericDataType<A> {

    constructor(componentType: Primitive<A>, size: number) {
        super(componentType, size)
    }

    asVector(): Vector<A> {
        return this
    }

    asArray(): DataArray<A, any> {
        throw new Error("Expected an array, but found a vector instead.")
    }
    
}

class GenericArray<A extends NumberArray, T extends DataType<A>> extends GenericDataType<A> implements DataArray<A, T> {

    constructor(readonly itemType: T, readonly length: number) {
        super(itemType.componentType, itemType.size * length)
    }

    asVector(): Vector<A> {
        throw new Error("Expected a vector, but found an array instead.")
    }

    asArray(): DataArray<A, any> {
        return this
    }

}

export function vectorOf<A extends NumberArray>(size: number, primitiveType: Primitive<A>): Vector<A> {
    return new GenericVector(primitiveType, size)
}

export function arrayOf<A extends NumberArray, T extends DataType<A>>(length: number, itemType: T) {
    return new GenericArray(itemType, length)
}

export class Discrete extends GenericVector<Int32Array> {
    asVector(): Vector<Int32Array> {
        throw new Error("Method not implemented.")
    }
    asArray(): DataArray<Int32Array, any> {
        throw new Error("Method not implemented.")
    }

    private constructor() {
        super(integer, 1)
    }

    static readonly type = new Discrete()

}

export class Scalar extends GenericVector<Float64Array> {
    asVector(): Vector<Float64Array> {
        throw new Error("Method not implemented.")
    }
    asArray(): DataArray<Float64Array, any> {
        throw new Error("Method not implemented.")
    }

    private constructor() {
        super(real, 1)
    }

    static readonly type = new Scalar()

}

export class Complex extends GenericVector<Float64Array> {
    asVector(): Vector<Float64Array> {
        throw new Error("Method not implemented.")
    }
    asArray(): DataArray<Float64Array, any> {
        throw new Error("Method not implemented.")
    }

    private constructor() {
        super(real, 2)
    }

    static readonly type = new Complex()

}

export const discrete = Discrete.type
export const scalar = Scalar.type
export const complex = Complex.type
