
import type { RouteDefinition } from "./RouteDefinition.js";

export class RouteRegistry {
  private readonly routes: RouteDefinition[] = [];

  public add(route: RouteDefinition): this {
    this.routes.push(route);

    return this;
  }

  public getAll(): readonly RouteDefinition[] {
    return this.routes;
  }

  public clear(): void {
    this.routes.length = 0;
  }
}
