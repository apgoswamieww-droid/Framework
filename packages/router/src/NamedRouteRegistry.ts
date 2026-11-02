import type { RouteDefinition } from "./RouteDefinition.js";

export class NamedRouteRegistry {
  private readonly routes = new Map<string, RouteDefinition>();

  public add(name: string, route: RouteDefinition): this {
    if (this.routes.has(name)) {
      throw new Error(`Route name already registered: ${name}`);
    }

    this.routes.set(name, route);

    return this;
  }

  public get(name: string): RouteDefinition | undefined {
    return this.routes.get(name);
  }

  public has(name: string): boolean {
    return this.routes.has(name);
  }

  public getAll(): ReadonlyMap<string, RouteDefinition> {
    return this.routes;
  }

  public clear(): void {
    this.routes.clear();
  }
}