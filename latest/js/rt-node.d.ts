import * as rt from "./rt.js";
import * as waNode from "./wa-node.js";
import binaryen from 'binaryen';
export * from "./rt.js";
export declare function addImportsToModule(module: binaryen.Module): void;
export declare function addMemImportsToModule(module: binaryen.Module): void;
export declare function addSpaceImportsToModule(module: binaryen.Module): void;
export declare function addDelayImportsToModule(module: binaryen.Module): void;
/**
 * @deprecated
 */
export declare function initWaModulesFS(waPath: string): rt.RuntimeModules;
export declare function fsRuntime(waPath: string): rt.Runtime;
export declare function fsLoadRuntimeModules(waPath: string): waNode.WebAssemblyModules<rt.RuntimeModuleNames>;
