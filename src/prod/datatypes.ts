export type Case<T, A, B> = T extends A ? B : never

export type NumberArray = Int32Array | Float64Array

export type PrimitiveSize<A extends NumberArray> = 
      Case<A, Int32Array, 4> 
    | Case<A, Float64Array, 8>

export type PrimitiveName<A extends NumberArray> = 
      Case<A, Int32Array, "integer"> 
    | Case<A, Float64Array, "real">

export interface RawView {

    get(byteOffset: number): number

    set(byteOffset: number, value: number): RawView

}

export interface Primitive<A extends NumberArray> {

    readonly name: PrimitiveName<A>
    
    readonly sizeInBytes: PrimitiveSize<A>

    view(buffer: ArrayBuffer, byteOffset?: number, length?: number): A

    rawView(buffer: ArrayBuffer, byteOffset?: number): RawView

}

export interface Vector<A extends NumberArray> {

    readonly componentType: Primitive<A>
    
    readonly size: number

    readonly sizeInBytes: number

    view(buffer: ArrayBuffer, byteOffset?: number, length?: number): A[]

    flatView(buffer: ArrayBuffer, byteOffset?: number, length?: number): A

    buffer(array: number[]): ArrayBuffer

    assignableFrom<V extends Vector<A>>(vector: V): boolean

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
    
    private constructor() {
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
    
    private constructor() {
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

class GenericVector<A extends NumberArray> implements Vector<A> {
    
    readonly sizeInBytes: number

    constructor(readonly componentType: Primitive<A>, readonly size: number) {
        this.sizeInBytes = componentType.sizeInBytes * size
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

    assignableFrom<V extends Vector<A>>(vector: V): boolean {
        return vector instanceof this.constructor && vector.size == this.size && vector.componentType === this.componentType
    }

}

export function vectorOf<A extends NumberArray>(size: number, primitiveType: Primitive<A>): Vector<A> {
    return new GenericVector(primitiveType, size)
}

export class Discrete extends GenericVector<Int32Array> {

    private constructor() {
        super(integer, 1)
    }

    static readonly type = new Discrete()

}

export class Scalar extends GenericVector<Float64Array> {

    private constructor() {
        super(real, 1)
    }

    static readonly type = new Scalar()

}

export class Complex extends GenericVector<Float64Array> {

    private constructor() {
        super(real, 2)
    }

    static readonly type = new Complex()

}

export const discrete = Discrete.type
export const scalar = Scalar.type
export const complex = Complex.type
