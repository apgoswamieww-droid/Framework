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

    public validateDefinition(route: RouteDefinition): void {
        const parameterNames = new Set<string>();

        const pattern = /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;

        for (const match of route.path.matchAll(pattern)) {
            const parameterName = match[1];

            if (parameterName) {
                parameterNames.add(parameterName);
            }
        }

        for (const constraintName of Object.keys(route.constraints ?? {})) {
            if (!parameterNames.has(constraintName)) {
                throw new Error(
                    `Constraint defined for unknown route parameter: ${constraintName}`
                );
            }
        }
    }
}