import type { RouteDefinition } from "./RouteDefinition.js";

/**
 * Precomputed matching data for a single route.
 *
 * Segment arrays and route priority are derived purely from the route path,
 * so they never change for a given route object. Precomputing them avoids
 * re-splitting and re-classifying every route on every request.
 */
export interface RouteMatchTemplate {
    readonly route: RouteDefinition;
    readonly segments: readonly string[];
    readonly priority: number;
}

/**
 * Matches a single route segment against the parameter syntax `{name}`.
 */
const PARAMETER_PATTERN = /^\{([a-zA-Z_][a-zA-Z0-9_]*)\}$/;

/**
 * Builds a {@link RouteMatchTemplate} for the given route.
 */
export function buildRouteTemplate(
    route: RouteDefinition
): RouteMatchTemplate {
    return {
        route,
        segments: route.path.split("/"),
        priority: getRoutePriority(route)
    };
}

/**
 * Returns 0 for static routes and 1 for dynamic routes. A lower value
 * means higher matching priority.
 */
function getRoutePriority(route: RouteDefinition): number {
    for (const segment of route.path.split("/")) {
        if (PARAMETER_PATTERN.test(segment)) {
            return 1;
        }
    }

    return 0;
}