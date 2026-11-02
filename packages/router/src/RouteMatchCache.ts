import type { RouteDefinition } from "./RouteDefinition.js";
import type { RouteMatchTemplate } from "./RouteMatchTemplate.js";
import { buildRouteTemplate } from "./RouteMatchTemplate.js";

/**
 * Builds a stable signature for a set of routes so the cache can detect
 * when the route collection has changed. The signature is derived from the
 * route identity (method + path) only — it never depends on request data.
 */
function getRouteSignature(
    routes: readonly RouteDefinition[]
): string {
    return routes
        .map((route) => `${route.method}:${route.path}`)
        .join("|");
}

/**
 * Caches the priority-sorted matching templates for a route collection.
 *
 * Only structural data is cached (segment splits and sort order), never
 * request results, so the cache cannot grow without bound and never holds
 * user-supplied values. The cache is invalidated whenever the route set
 * changes, which is triggered by {@link RouteMatchCache.invalidate}.
 */
export class RouteMatchCache {
    private readonly templates = new Map<string, RouteMatchTemplate[]>();
    private lastSignature = "";
    private lastTemplates: RouteMatchTemplate[] | null = null;

    /**
     * Returns the priority-sorted templates for the given routes.
     *
     * The result is a stable-sorted copy so that static routes always take
     * priority over dynamic routes, and routes with equal priority keep their
     * original registration order.
     */
    public getTemplates(
        routes: readonly RouteDefinition[]
    ): RouteMatchTemplate[] {
        const signature = getRouteSignature(routes);

        if (signature === this.lastSignature) {
            return this.lastTemplates ?? [];
        }

        const templates = routes.map(buildRouteTemplate);
        templates.sort((a, b) => a.priority - b.priority);

        this.lastSignature = signature;
        this.lastTemplates = templates;
        this.templates.set(signature, templates);

        return templates;
    }

    /**
     * Invalidates the cache. Call this whenever routes are registered or
     * modified so subsequent matches do not use stale data.
     */
    public invalidate(): void {
        this.templates.clear();
        this.lastSignature = "";
        this.lastTemplates = null;
    }
}