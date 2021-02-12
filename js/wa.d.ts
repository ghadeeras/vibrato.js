export declare type Module<E extends WebAssembly.Exports> = {
    readonly sourceFile: string;
    exports?: E;
};
export declare type Modules = Readonly<Record<string, Module<WebAssembly.Exports>>>;
export declare type ModuleName<M extends Modules> = keyof M;
export declare function module<E extends WebAssembly.Exports>(sourceFile: string): Module<E>;
export declare function instantiate<E extends WebAssembly.Exports>(buffer: ArrayBuffer, dependencies: Modules): E;
export declare function loadWeb<M extends Modules>(waPath: string, modules: M, first: ModuleName<M>, ...rest: ModuleName<M>[]): Promise<M>;
export declare function loadFS<M extends Modules>(waPath: string, modules: M, first: ModuleName<M>, ...rest: ModuleName<M>[]): M;
//# sourceMappingURL=wa.d.ts.map