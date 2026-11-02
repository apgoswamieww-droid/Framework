import type { RouteDefinition } from "./RouteDefinition.js";
import { RouteConstraintValidator } from "./RouteConstraintValidator.js";
import { RouteMatchCache } from "./RouteMatchCache.js";
import type { RouteMatchTemplate } from "./RouteMatchTemplate.js";

export interface RouteMatch {
    route: RouteDefinition;
    params: Record<string, string>;
}

/**
 * Matches a single route segment against the parameter syntax `{name}`.
 */
const PARAMETER_PATTERN = /^\{([a-zA-Z_][a-zA-Z0-9_]*)\}$/;

export class RouteMatcher {

    private readonly constraintValidator: RouteConstraintValidator;
    private readonly cache: RouteMatchCache;

    constructor() {
        this.constraintValidator = new RouteConstraintValidator();
        this.cache = new RouteMatchCache();
    }

    public match(
        routes: readonly RouteDefinition[],
        method: string,
        pathname: string
    ): RouteMatch | undefined {
        const requestSegments = pathname.split("/");
        const templates = this.cache.getTemplates(routes);

        for (const template of templates) {
            if (template.route.method !== method) {
                continue;
            }

            const routeSegments = template.segments;

            if (routeSegments.length !== requestSegments.length) {
                continue;
            }

            const params: Record<string, string> = {};
            let matched = true;

            for (let index = 0; index < routeSegments.length; index++) {
                const routeSegment = routeSegments[index];
                const requestSegment = requestSegments[index];

                if (
                    routeSegment === undefined ||
                    requestSegment === undefined
                ) {
                    matched = false;
                    break;
                }

                const parameterMatch = PARAMETER_PATTERN.exec(routeSegment);

                if (parameterMatch) {
                    const parameterName = parameterMatch[1];

                    if (!parameterName || requestSegment.length === 0) {
                        matched = false;
                        break;
                    }

                    try {
                        const decodedValue = decodeURIComponent(
                            requestSegment
                        );

                        // Reject encoded path separators and control characters.
                        if (
                            decodedValue.includes("/") ||
                            decodedValue.includes("\\") ||
                            /[\u0000-\u001F\u007F]/.test(decodedValue)
                        ) {
                            matched = false;
                            break;
                        }

                        Object.defineProperty(params, parameterName, {
                            value: decodedValue,
                            enumerable: true,
                            configurable: true,
                            writable: true
                        });
                    } catch {
                        matched = false;
                        break;
                    }

                    continue;
                }

                if (routeSegment !== requestSegment) {
                    matched = false;
                    break;
                }
            }

            if (
                matched &&
                this.constraintValidator.validate(
                    template.route,
                    params
                )
            ) {
                return { route: template.route, params };
            }
        }

        return undefined;
    }

    /**
     * Invalidates the matching cache. Call this whenever routes are
     * registered or modified so subsequent matches do not use stale data.
     */
    public invalidate(): void {
        this.cache.invalidate();
    }
}