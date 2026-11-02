import type { RouteDefinition } from "./RouteDefinition.js";

export class RouteConstraintValidator {
  public validate(
    route: RouteDefinition,
    params: Record<string, string>
  ): boolean {
    if (!route.constraints) {
      return true;
    }

    for (const [parameterName, constraint] of Object.entries(
      route.constraints
    )) {
      if (!Object.hasOwn(params, parameterName)) {
        return false;
      }

      const value = params[parameterName];

      if (typeof value !== "string" || !constraint(value)) {
        return false;
      }
    }

    return true;
  }
}