
import type { HttpMethod } from "./HttpMethod.js";
import type { RouteDefinition } from "./RouteDefinition.js";
import type { RouteHandler } from "./RouteHandler.js";
import type { RouteContext } from "./RouteHandler.js";
import { RouteMiddlewareRunner } from "./RouteMiddlewareRunner.js";

import { RouteMatcher } from "./RouteMatcher.js";
import { RouteRegistry } from "./RouteRegistry.js";
import { validateRoutePath } from "./RoutePathValidator.js";
import { NamedRouteRegistry } from "./NamedRouteRegistry.js";
import { RouteUrlGenerator, type RouteParameters } from "./RouteUrlGenerator.js";
import type { RouteMiddleware } from "./RouteMiddleware.js";
import type { RouteParameterConstraint } from "./RouteParameterConstraint.js";

export class Router {
    private readonly registry: RouteRegistry;
    private readonly matcher: RouteMatcher;
    private readonly namedRoutes: NamedRouteRegistry;
    private readonly urlGenerator: RouteUrlGenerator;
    private groupPrefix = "";
    private readonly middlewareRunner: RouteMiddlewareRunner;
    private groupMiddleware: readonly RouteMiddleware[] = [];

    constructor() {
        this.registry = new RouteRegistry();
        this.matcher = new RouteMatcher();
        this.namedRoutes = new NamedRouteRegistry();
        this.urlGenerator = new RouteUrlGenerator();
        this.middlewareRunner = new RouteMiddlewareRunner();
    }

    public add(
        method: HttpMethod,
        path: string,
        handler: RouteHandler,
        name?: string,
        middleware?: readonly RouteMiddleware[],
        constraints?: Readonly<
            Record<string, RouteParameterConstraint>
        >
    ): this {
        const fullPath =
            this.groupPrefix && path === "/"
                ? this.groupPrefix
                : `${this.groupPrefix}${path}`;

        validateRoutePath(fullPath);

        if (name && this.namedRoutes.has(name)) {
            throw new Error(`Route name already registered: ${name}`);
        }

        const combinedMiddleware = [
            ...this.groupMiddleware,
            ...(middleware ?? [])
        ];

        const route: RouteDefinition = {
            method,
            path: fullPath,
            handler,
            ...(name ? { name } : {}),
            ...(combinedMiddleware.length > 0
                ? { middleware: combinedMiddleware }
                : {}),
            ...(constraints ? { constraints } : {})
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
        name?: string,
        middleware?: readonly RouteMiddleware[],
        constraints?: Readonly<
            Record<string, RouteParameterConstraint>
        >
    ): this {
        return this.add("GET", path, handler, name, middleware, constraints);
    }

    public post(
        path: string,
        handler: RouteHandler,
        name?: string,
        middleware?: readonly RouteMiddleware[],
        constraints?: Readonly<
            Record<string, RouteParameterConstraint>
        >
    ): this {
        return this.add("POST", path, handler, name, middleware, constraints);
    }

    public put(
        path: string,
        handler: RouteHandler,
        name?: string,
        middleware?: readonly RouteMiddleware[],
        constraints?: Readonly<
            Record<string, RouteParameterConstraint>
        >
    ): this {
        return this.add("PUT", path, handler, name, middleware, constraints);
    }

    public patch(
        path: string,
        handler: RouteHandler,
        name?: string,
        middleware?: readonly RouteMiddleware[],
        constraints?: Readonly<
            Record<string, RouteParameterConstraint>
        >
    ): this {
        return this.add("PATCH", path, handler, name, middleware, constraints);
    }

    public delete(
        path: string,
        handler: RouteHandler,
        name?: string,
        middleware?: readonly RouteMiddleware[],
        constraints?: Readonly<
            Record<string, RouteParameterConstraint>
        >
    ): this {
        return this.add("DELETE", path, handler, name, middleware, constraints);
    }

    public options(
        path: string,
        handler: RouteHandler,
        name?: string,
        middleware?: readonly RouteMiddleware[],
        constraints?: Readonly<
            Record<string, RouteParameterConstraint>
        >
    ): this {
        return this.add("OPTIONS", path, handler, name, middleware, constraints);
    }

    public head(
        path: string,
        handler: RouteHandler,
        name?: string,
        middleware?: readonly RouteMiddleware[],
        constraints?: Readonly<
            Record<string, RouteParameterConstraint>
        >
    ): this {
        return this.add("HEAD", path, handler, name, middleware, constraints);
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

    public group(
        prefix: string,
        callback: () => void,
        middleware: readonly RouteMiddleware[] = []
    ): this {
        validateRoutePath(prefix);

        const previousPrefix = this.groupPrefix;
        const previousMiddleware = this.groupMiddleware;

        this.groupPrefix =
            prefix === "/"
                ? previousPrefix
                : `${previousPrefix}${prefix}`;

        this.groupMiddleware = [
            ...previousMiddleware,
            ...middleware
        ];

        try {
            callback();
        } finally {
            this.groupPrefix = previousPrefix;
            this.groupMiddleware = previousMiddleware;
        }

        return this;
    }

    public async execute(
        route: RouteDefinition,
        context: RouteContext
    ): Promise<void> {
        await this.middlewareRunner.run(
            context,
            route.middleware ?? [],
            route.handler
        );
    }
}
