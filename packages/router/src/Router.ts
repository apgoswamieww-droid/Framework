
import type { HttpMethod } from "./HttpMethod.js";
import type { RouteDefinition } from "./RouteDefinition.js";
import type { RouteHandler } from "./RouteHandler.js";

import { RouteMatcher } from "./RouteMatcher.js";
import { RouteRegistry } from "./RouteRegistry.js";
import { validateRoutePath } from "./RoutePathValidator.js";
import { NamedRouteRegistry } from "./NamedRouteRegistry.js";
import { RouteUrlGenerator, type RouteParameters } from "./RouteUrlGenerator.js";

export class Router {
    private readonly registry: RouteRegistry;
    private readonly matcher: RouteMatcher;
    private readonly namedRoutes: NamedRouteRegistry;
    private readonly urlGenerator: RouteUrlGenerator;
    private groupPrefix = "";

    constructor() {
        this.registry = new RouteRegistry();
        this.matcher = new RouteMatcher();
        this.namedRoutes = new NamedRouteRegistry();
        this.urlGenerator = new RouteUrlGenerator();
    }

    public add(
        method: HttpMethod,
        path: string,
        handler: RouteHandler,
        name?: string
    ): this {
        const fullPath =
            this.groupPrefix && path === "/"
                ? this.groupPrefix
                : `${this.groupPrefix}${path}`;

        validateRoutePath(fullPath);

        if (name && this.namedRoutes.has(name)) {
            throw new Error(`Route name already registered: ${name}`);
        }

        const route: RouteDefinition = {
            method,
            path: fullPath,
            handler,
            ...(name ? { name } : {})
        };

        this.registry.add(route);

        if (name) {
            this.namedRoutes.add(name, route);
        }

        return this;
    }

    public match(
        method: HttpMethod,
        pathname: string
    ) {
        return this.matcher.match(
            this.registry.getAll(),
            method,
            pathname
        );
    }

    public getRoutes(): readonly RouteDefinition[] {
        return this.registry.getAll();
    }

    public get(
        path: string,
        handler: RouteHandler,
        name?: string
    ): this {
        return this.add("GET", path, handler, name);
    }

    public post(
        path: string,
        handler: RouteHandler,
        name?: string
    ): this {
        return this.add("POST", path, handler, name);
    }

    public put(
        path: string,
        handler: RouteHandler,
        name?: string
    ): this {
        return this.add("PUT", path, handler, name);
    }

    public patch(
        path: string,
        handler: RouteHandler,
        name?: string
    ): this {
        return this.add("PATCH", path, handler, name);
    }

    public delete(
        path: string,
        handler: RouteHandler,
        name?: string
    ): this {
        return this.add("DELETE", path, handler, name);
    }

    public options(
        path: string,
        handler: RouteHandler,
        name?: string
    ): this {
        return this.add("OPTIONS", path, handler, name);
    }

    public head(
        path: string,
        handler: RouteHandler,
        name?: string
    ): this {
        return this.add("HEAD", path, handler, name);
    }

    public getNamedRoute(name: string): RouteDefinition | undefined {
        return this.namedRoutes.get(name);
    }

    public url(
        name: string,
        parameters: RouteParameters = {}
    ): string {
        const route = this.getNamedRoute(name);

        if (!route) {
            throw new Error(`Named route not found: ${name}`);
        }

        return this.urlGenerator.generate(route, parameters);
    }

    public group(prefix: string, callback: () => void): this {
        validateRoutePath(prefix);

        const previousPrefix = this.groupPrefix;

        this.groupPrefix =
            prefix === "/"
                ? previousPrefix
                : `${previousPrefix}${prefix}`;

        try {
            callback();
        } finally {
            this.groupPrefix = previousPrefix;
        }

        return this;
    }
}
