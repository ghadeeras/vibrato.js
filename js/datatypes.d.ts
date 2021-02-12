import * as binaryen from "binaryen";
export declare type Case<T, A, B> = T extends A ? B : never;
export declare type NumberArray = Int32Array | Float64Array;
export declare type PrimitiveSize<A extends NumberArray> = Case<A, Int32Array, 4> | Case<A, Float64Array, 8>;
export declare type PrimitiveName<A extends NumberArray> = Case<A, Int32Array, "integer"> | Case<A, Float64Array, "real">;
export declare type BinaryenInstructionType = binaryen.Module["i32"] | binaryen.Module["f64"];
export interface RawView {
    get(byteOffset: number): number;
    set(byteOffset: number, value: number): RawView;
}
export interface Primitive<A extends NumberArray> {
    readonly name: PrimitiveName<A>;
    readonly sizeInBytes: PrimitiveSize<A>;
    readonly binaryenType: binaryen.Type;
    instructionType(module: binaryen.Module): BinaryenInstructionType;
    view(buffer: ArrayBuffer, byteOffset?: number, length?: number): A;
    rawView(buffer: ArrayBuffer, byteOffset?: number): RawView;
}
export interface DataType<A extends NumberArray> {
    readonly componentType: Primitive<A>;
    readonly size: number;
    readonly sizeInBytes: number;
    readonly binaryenType: binaryen.Type;
    instructionType(module: binaryen.Module): BinaryenInstructionType;
    view(buffer: ArrayBuffer, byteOffset?: number, length?: number): A[];
    flatView(buffer: ArrayBuffer, byteOffset?: number, length?: number): A;
    buffer(array: number[]): ArrayBuffer;
    assignableFrom<T extends DataType<A>>(dataType: T): boolean;
    asVector(): Vector<A>;
    asArray(): DataArray<A, any>;
}
export interface Vector<A extends NumberArray> extends DataType<A> {
}
export interface DataArray<A extends NumberArray, T extends DataType<A>> extends DataType<A> {
    readonly itemType: T;
    readonly length: number;
}
export declare class Integer implements Primitive<Int32Array> {
    readonly name = "integer";
    readonly sizeInBytes = 4;
    readonly binaryenType: number;
    private constructor();
    instructionType(module: binaryen.Module): {
        load(offset: number, align: number, ptr: number): number;
        load8_s(offset: number, align: number, ptr: number): number;
        load8_u(offset: number, align: number, ptr: number): number;
        load16_s(offset: number, align: number, ptr: number): number;
        load16_u(offset: number, align: number, ptr: number): number;
        store(offset: number, align: number, ptr: number, value: number): number;
        store8(offset: number, align: number, ptr: number, value: number): number;
        store16(offset: number, align: number, ptr: number, value: number): number;
        const(value: number): number;
        clz(value: number): number;
        ctz(value: number): number;
        popcnt(value: number): number;
        eqz(value: number): number;
        trunc_s: {
            f32(value: number): number;
            f64(value: number): number;
        };
        trunc_u: {
            f32(value: number): number;
            f64(value: number): number;
        };
        trunc_s_sat: {
            f32(value: number): number;
            f64(value: number): number;
        };
        trunc_u_sat: {
            f32(value: number): number;
            f64(value: number): number;
        };
        reinterpret(value: number): number;
        extend8_s(value: number): number;
        extend16_s(value: number): number;
        wrap(value: number): number;
        add(left: number, right: number): number;
        sub(left: number, right: number): number;
        mul(left: number, right: number): number;
        div_s(left: number, right: number): number;
        div_u(left: number, right: number): number;
        rem_s(left: number, right: number): number;
        rem_u(left: number, right: number): number;
        and(left: number, right: number): number;
        or(left: number, right: number): number;
        xor(left: number, right: number): number;
        shl(left: number, right: number): number;
        shr_u(left: number, right: number): number;
        shr_s(left: number, right: number): number;
        rotl(left: number, right: number): number;
        rotr(left: number, right: number): number;
        eq(left: number, right: number): number;
        ne(left: number, right: number): number;
        lt_s(left: number, right: number): number;
        lt_u(left: number, right: number): number;
        le_s(left: number, right: number): number;
        le_u(left: number, right: number): number;
        gt_s(left: number, right: number): number;
        gt_u(left: number, right: number): number;
        ge_s(left: number, right: number): number;
        ge_u(left: number, right: number): number;
        atomic: {
            load(offset: number, ptr: number): number;
            load8_u(offset: number, ptr: number): number;
            load16_u(offset: number, ptr: number): number;
            store(offset: number, ptr: number, value: number): number;
            store8(offset: number, ptr: number, value: number): number;
            store16(offset: number, ptr: number, value: number): number;
            rmw: {
                add(offset: number, ptr: number, value: number): number;
                sub(offset: number, ptr: number, value: number): number;
                and(offset: number, ptr: number, value: number): number;
                or(offset: number, ptr: number, value: number): number;
                xor(offset: number, ptr: number, value: number): number;
                xchg(offset: number, ptr: number, value: number): number;
                cmpxchg(offset: number, ptr: number, expected: number, replacement: number): number;
            };
            rmw8_u: {
                add(offset: number, ptr: number, value: number): number;
                sub(offset: number, ptr: number, value: number): number;
                and(offset: number, ptr: number, value: number): number;
                or(offset: number, ptr: number, value: number): number;
                xor(offset: number, ptr: number, value: number): number;
                xchg(offset: number, ptr: number, value: number): number;
                cmpxchg(offset: number, ptr: number, expected: number, replacement: number): number;
            };
            rmw16_u: {
                add(offset: number, ptr: number, value: number): number;
                sub(offset: number, ptr: number, value: number): number;
                and(offset: number, ptr: number, value: number): number;
                or(offset: number, ptr: number, value: number): number;
                xor(offset: number, ptr: number, value: number): number;
                xchg(offset: number, ptr: number, value: number): number;
                cmpxchg(offset: number, ptr: number, expected: number, replacement: number): number;
            };
        };
        pop(): number;
    };
    view(buffer: ArrayBuffer, byteOffset?: number, length?: number): Int32Array;
    rawView(buffer: ArrayBuffer, byteOffset?: number): RawView;
    static readonly type: Integer;
}
export declare class Real implements Primitive<Float64Array> {
    readonly name = "real";
    readonly sizeInBytes = 8;
    readonly binaryenType: number;
    private constructor();
    instructionType(module: binaryen.Module): {
        load(offset: number, align: number, ptr: number): number;
        store(offset: number, align: number, ptr: number, value: number): number;
        const(value: number): number;
        const_bits(low: number, high: number): number;
        neg(value: number): number;
        abs(value: number): number;
        ceil(value: number): number;
        floor(value: number): number;
        trunc(value: number): number;
        nearest(value: number): number;
        sqrt(value: number): number;
        reinterpret(value: number): number;
        convert_s: {
            i32(value: number): number;
            i64(value: number): number;
        };
        convert_u: {
            i32(value: number): number;
            i64(value: number): number;
        };
        promote(value: number): number;
        add(left: number, right: number): number;
        sub(left: number, right: number): number;
        mul(left: number, right: number): number;
        div(left: number, right: number): number;
        copysign(left: number, right: number): number;
        min(left: number, right: number): number;
        max(left: number, right: number): number;
        eq(left: number, right: number): number;
        ne(left: number, right: number): number;
        lt(left: number, right: number): number;
        le(left: number, right: number): number;
        gt(left: number, right: number): number;
        ge(left: number, right: number): number;
        pop(): number;
    };
    view(buffer: ArrayBuffer, byteOffset?: number, length?: number): Float64Array;
    rawView(buffer: ArrayBuffer, byteOffset?: number): RawView;
    static readonly type: Real;
}
export declare const integer: Integer;
export declare const real: Real;
declare abstract class GenericDataType<A extends NumberArray> implements DataType<A> {
    readonly componentType: Primitive<A>;
    readonly size: number;
    readonly sizeInBytes: number;
    readonly binaryenType: binaryen.Type;
    constructor(componentType: Primitive<A>, size: number);
    abstract asVector(): Vector<A>;
    abstract asArray(): DataArray<A, any>;
    instructionType(module: binaryen.Module): BinaryenInstructionType;
    view(buffer: ArrayBuffer, byteOffset?: number, length?: number): A[];
    flatView(buffer: ArrayBuffer, byteOffset?: number, length?: number): A;
    buffer(array: number[]): ArrayBuffer;
    assignableFrom<T extends DataType<A>>(dataType: T): boolean;
}
declare class GenericVector<A extends NumberArray> extends GenericDataType<A> {
    constructor(componentType: Primitive<A>, size: number);
    asVector(): Vector<A>;
    asArray(): DataArray<A, any>;
}
declare class GenericArray<A extends NumberArray, T extends DataType<A>> extends GenericDataType<A> implements DataArray<A, T> {
    readonly itemType: T;
    readonly length: number;
    constructor(itemType: T, length: number);
    asVector(): Vector<A>;
    asArray(): DataArray<A, any>;
}
export declare function vectorOf<A extends NumberArray>(size: number, primitiveType: Primitive<A>): Vector<A>;
export declare function arrayOf<A extends NumberArray, T extends DataType<A>>(length: number, itemType: T): GenericArray<NumberArray, T>;
export declare class Discrete extends GenericVector<Int32Array> {
    asVector(): Vector<Int32Array>;
    asArray(): DataArray<Int32Array, any>;
    private constructor();
    static readonly type: Discrete;
}
export declare class Scalar extends GenericVector<Float64Array> {
    asVector(): Vector<Float64Array>;
    asArray(): DataArray<Float64Array, any>;
    private constructor();
    static readonly type: Scalar;
}
export declare class Complex extends GenericVector<Float64Array> {
    asVector(): Vector<Float64Array>;
    asArray(): DataArray<Float64Array, any>;
    private constructor();
    static readonly type: Complex;
}
export declare const discrete: Discrete;
export declare const scalar: Scalar;
export declare const complex: Complex;
export {};
//# sourceMappingURL=datatypes.d.ts.map