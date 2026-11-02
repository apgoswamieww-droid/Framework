import { describe, expect, it } from "vitest";
import { RouteMatcher } from "../packages/router/src/RouteMatcher.js";
import type { RouteDefinition } from "../packages/router/src/RouteDefinition.js";

describe("RouteMatcher Constraints", () => {
    const matcher = new RouteMatcher();

    const handler = () => {};

    const routes: RouteDefinition[] = [
        {
            method: "GET",
            path: "/users/{id}",
            handler,
            constraints: {
                id: (value) => /^\d+$/.test(value)
            }
        }
    ];

    it("should match a route with a valid constrained parameter", () => {
        const result = matcher.match(routes, "GET", "/users/123");

        expect(result).toBeDefined();
        expect(result?.params.id).toBe("123");
    });

    it("should not match a route with an invalid constrained parameter", () => {
        const result = matcher.match(routes, "GET", "/users/abc");

        expect(result).toBeUndefined();
    });

    it("should continue checking routes when constraints fail", () => {
        const additionalRoutes: RouteDefinition[] = [
            ...routes,
            {
                method: "GET",
                path: "/users/{username}",
                handler
            }
        ];

        const result = matcher.match(
            additionalRoutes,
            "GET",
            "/users/abc"
        );

        expect(result).toBeDefined();
        expect(result?.route.path).toBe("/users/{username}");
    });
});