import * as wa from "./wa.js";
export * from "./wa.js";
/**
 * @deprecated
 */
export declare function loadFS<M extends wa.Modules>(waPath: string, modules: M, first: wa.ModuleName<M>, ...rest: wa.ModuleName<M>[]): M;
export declare function fsLoadModules<N extends string>(waPath: string, modulePaths: wa.WebAssemblyModulePaths<N>): wa.WebAssemblyModules<N>;
