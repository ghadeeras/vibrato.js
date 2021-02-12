export type Case<T, A, B> = T extends A ? B : never

export type NumberArray = Int32Array | Float64Array

export type PrimitiveSize<A extends NumberArray> = 
      Case<A, Int32Array, 4> 
    | Case<A, Float64Array, 8>

export type PrimitiveName<A extends NumberArray> = 
      Case<A, Int32Array, "integer"> 
    | Case<A, Float64Array, "real">

export interface RawView {

    get(offset: number): number

    set(offset: number, value: number): RawView

}

export interface Primitive<A extends NumberArray> {

    readonly name: PrimitiveName<A>
    
    readonly sizeInBytes: PrimitiveSize<A>

    view(buffer: ArrayBuffer, offset?: number, length?: number): A

    rawView(buffer: ArrayBuffer, offset?: number): RawView

}

export interface Vector<A extends NumberArray, S extends number> {

    readonly primitiveType: Primitive<A>
    
    readonly size: S

    readonly sizeInBytes: number

    view(buffer: ArrayBuffer, offset?: number, length?: number): A[]

    flatView(buffer: ArrayBuffer, offset?: number, length?: number): A

}

class GenericRawView implements RawView {

    private view: DataView
    
    constructor(
        buffer: ArrayBuffer, 
        offset: number, 
        private getter: (dv: DataView, o: number) => number, 
        private setter: (dv: DataView, o: number, v: number) => void
    ) {
        this.view = new DataView(buffer, offset)
    }

    get(offset: number): number {
        return this.getter(this.view, offset)
    }

    set(offset: number, value: number): RawView {
        this.setter(this.view, offset, value)
        return this
    }

}

export class Integer implements Primitive<Int32Array> {

    readonly name = "integer"

    readonly sizeInBytes = 4
    
    private constructor() {
    }
    
    view(buffer: ArrayBuffer, offset: number = 0, length: number = 1): Int32Array {
        return new Int32Array(buffer, offset, length)
    }

    rawView(buffer: ArrayBuffer, offset: number = 0): RawView {
        return new GenericRawView(buffer, offset, 
            (dv, o) => dv.getInt32(o), 
            (dv, o, v) => dv.setInt32(o, v)
        )
    }

    static readonly type = new Integer()

}

export class Real implements Primitive<Float64Array> {

    readonly name = "real"

    readonly sizeInBytes = 8
    
    private constructor() {
    }
    
    view(buffer: ArrayBuffer, offset: number = 0, length: number = 1): Float64Array {
        return new Float64Array(buffer, offset, length)
    }

    rawView(buffer: ArrayBuffer, offset: number = 0): RawView {
        return new GenericRawView(buffer, offset, 
            (dv, o) => dv.getFloat64(o), 
            (dv, o, v) => dv.setFloat64(o, v)
        )
    }

    static readonly type = new Real()

}

export const integer = Integer.type
export const real = Real.type

class GenericVector<A extends NumberArray, S extends number> implements Vector<A, S> {
    
    readonly sizeInBytes: number

    constructor(readonly primitiveType: Primitive<A>, readonly size: S) {
        this.sizeInBytes = primitiveType.sizeInBytes * size
    }

    view(buffer: ArrayBuffer, offset: number = 0, length: number = 1): A[] {
        const result: A[] = []
        for (let o = offset; length-- > 0; o += this.primitiveType.sizeInBytes) {
            result.push(this.primitiveType.view(buffer, o, this.size))
        }
        return result
    }

    flatView(buffer: ArrayBuffer, offset: number = 0, length: number = 1): A {
        return this.primitiveType.view(buffer, offset, length * this.size)
    }

}

export function vectorOf<A extends NumberArray, S extends number>(size: S, primitiveType: Primitive<A>): Vector<A, S> {
    return new GenericVector(primitiveType, size)
}

export class Discrete extends GenericVector<Int32Array, 1> {

    private constructor() {
        super(integer, 1)
    }

    static readonly type = new Discrete()

}

export class Scalar extends GenericVector<Float64Array, 1> {

    private constructor() {
        super(real, 1)
    }

    static readonly type = new Scalar()

}

export class Complex extends GenericVector<Float64Array, 2> {

    private constructor() {
        super(real, 2)
    }

    static readonly type = new Complex()

}

export const discrete = Discrete.type
export const scalar = Scalar.type
export const complex = Complex.type
