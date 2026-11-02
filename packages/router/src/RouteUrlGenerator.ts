import type { RouteDefinition } from "./RouteDefinition.js";

export type RouteParameters = Record<string, string | number>;

const PARAMETER_PATTERN = /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;

export class RouteUrlGenerator {
    public generate(
        route: RouteDefinition,
        parameters: RouteParameters = {}
    ): string {
        const requiredParameters = new Set<string>();

        for (const match of route.path.matchAll(PARAMETER_PATTERN)) {
            const parameterName = match[1];

            if (parameterName) {
                requiredParameters.add(parameterName);
            }
        }

        for (const parameterName of requiredParameters) {
            if (!Object.hasOwn(parameters, parameterName)) {
                throw new Error(
                    `Missing route parameter: ${parameterName}`
                );
            }
        }

        for (const parameterName of Object.keys(parameters)) {
            if (!requiredParameters.has(parameterName)) {
                throw new Error(
                    `Unexpected route parameter: ${parameterName}`
                );
            }
        }

        return route.path.replace(
            PARAMETER_PATTERN,
            (_match, parameterName: string) => {
                const value = parameters[parameterName];

                if (typeof value !== "string" && typeof value !== "number") {
                    throw new Error(
                        `Invalid route parameter: ${parameterName}`
                    );
                }

                if (typeof value === "number" && !Number.isFinite(value)) {
                    throw new Error(
                        `Invalid numeric route parameter: ${parameterName}`
                    );
                }

                const stringValue = String(value);

                if (
                    stringValue.length === 0 ||
                    stringValue.includes("/") ||
                    stringValue.includes("\\") ||
                    /[\u0000-\u001F\u007F]/.test(stringValue)
                ) {
                    throw new Error(
                        `Invalid route parameter value: ${parameterName}`
                    );
                }

                try {
                    return encodeURIComponent(stringValue);
                } catch {
                    throw new Error(
                        `Unable to encode route parameter: ${parameterName}`
                    );
                }
            }
        );
    }
}