/**
 * @deprecated
 */
export declare type Module<E extends WebAssembly.Exports> = {
    readonly sourceFile: string;
    exports?: E;
};
/**
 * @deprecated
 */
export declare type Modules = Readonly<Record<string, Module<WebAssembly.Exports>>>;
/**
 * @deprecated
 */
export declare type ModuleName<M extends Modules> = keyof M;
/**
 * @deprecated
 */
export declare function module<E extends WebAssembly.Exports>(sourceFile: string): Module<E>;
/**
 * @deprecated
 */
export declare function instantiate<E extends WebAssembly.Exports>(buffer: ArrayBuffer, dependencies: Modules): E;
/**
 * @deprecated
 */
export declare function loadWeb<M extends Modules>(waPath: string, modules: M, first: ModuleName<M>, ...rest: ModuleName<M>[]): Promise<M>;
export declare type WebAssemblyModulePaths<N extends string> = Record<N, string>;
export declare type WebAssemblyModules<N extends string> = Record<N, WebAssembly.Module>;
export declare type WebAssemblyInstance = Pick<WebAssembly.Instance, any>;
export declare type WebAssemblyInstances<N extends string> = Record<N, WebAssemblyInstance>;
export declare function webLoadModules<N extends string>(waPath: string, modulePaths: WebAssemblyModulePaths<N>): Promise<WebAssemblyModules<N>>;
export declare class Linker<N extends string> {
    private modules;
    private linking;
    private instances;
    constructor(modules: WebAssemblyModules<N>);
    link<E extends string>(externalInstances: WebAssemblyInstances<E>): WebAssemblyInstances<N | E>;
    private linkModule;
    asImports(exps: WebAssemblyInstances<string>): WebAssembly.Imports;
    private getModule;
    private beginLinking;
    private endLinking;
}
export declare function required<T>(value: T | null | undefined): T;
