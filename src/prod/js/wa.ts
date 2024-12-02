export type WebAssemblyModulePaths<N extends string> = Record<N, string>
export type WebAssemblyModules<N extends string> = Record<N, WebAssembly.Module>
export type WebAssemblyInstance = Pick<WebAssembly.Instance, any>
export type WebAssemblyInstances<N extends string> = Record<N, WebAssemblyInstance>

export type ModulesLoader = <N extends string>(waPath: string, modulePaths: WebAssemblyModulePaths<N>) => Promise<WebAssemblyModules<N>>

export const webModulesLoader: ModulesLoader = webLoadModules

export async function webLoadModules<N extends string>(waPath: string, modulePaths: WebAssemblyModulePaths<N>): Promise<WebAssemblyModules<N>> {
    const result: WebAssemblyModules<string> = {}
    for (const moduleName in modulePaths) {
        const modulePath = modulePaths[moduleName]
        const response = await fetch(`${waPath}/${modulePath}`, { method: "get", mode: "no-cors" });
        const buffer = await response.arrayBuffer();
        result[moduleName] = new WebAssembly.Module(buffer)
    }
    return result
}

export class Linker<N extends string> {

    private linking: Set<string> = new Set()
    private instances: WebAssemblyInstances<string> = {}

    constructor(private modules: WebAssemblyModules<N>) {
    }

    link<E extends string>(externalInstances: WebAssemblyInstances<E>) {
        this.linking.clear()
        this.instances = { ...externalInstances }
        for (const moduleName in this.modules) {
            this.linkModule(moduleName)
        }
        const result = this.instances as WebAssemblyInstances<N | E>;
        this.instances = {}
        return result
    }

    private linkModule(moduleName: string) {
        if (this.beginLinking(moduleName)) {
            const waModule = this.getModule(moduleName)
            const impDescriptors = WebAssembly.Module.imports(waModule)
            for (const descriptor of impDescriptors) {
                this.linkModule(descriptor.module)
            }
            const waInstance = new WebAssembly.Instance(waModule, this.asImports(this.instances))
            this.endLinking(moduleName, waInstance)
        }
    }

    asImports(exps: WebAssemblyInstances<string>): WebAssembly.Imports {
        const result: WebAssembly.Imports = {}
        for (const moduleName in exps) {
            const instance = exps[moduleName]
            result[moduleName] = instance.exports
        }
        return result 
    }

    private getModule(moduleName: string) {
        if (!(moduleName in this.modules)) {
            throw new Error(`Module ${moduleName} not found`);
        }
        return this.modules[moduleName as N];
    }

    private beginLinking(moduleName: string): boolean {
        if (moduleName in this.instances) {
            return false
        }
        if (this.linking.has(moduleName)) {
            throw new Error(`Circular dependency in ${this.linking}`);
        }
        this.linking.add(moduleName);
        return true
    }

    private endLinking(moduleName: string, waInstance: WebAssemblyInstance) {
        this.linking.delete(moduleName)
        this.instances[moduleName] = waInstance;
    }

}

export function required<T>(value: T | null | undefined): T {
    if (!value) {
        throw new Error("Required value is null or undefined!!!")
    }
    return value
}