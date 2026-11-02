import { describe, expect, it } from "vitest";
import { RouteUrlGenerator } from "../packages/router/src/RouteUrlGenerator.js";
import type { RouteDefinition } from "../packages/router/src/RouteDefinition.js";

describe("RouteUrlGenerator", () => {
    const generator = new RouteUrlGenerator();

    const createRoute = (path: string): RouteDefinition => ({
        method: "GET",
        path,
        handler: () => { }
    });

    it("should generate a URL for a static route", () => {
        const route = createRoute("/users");

        expect(generator.generate(route)).toBe("/users");
    });

    it("should generate a URL with a single parameter", () => {
        const route = createRoute("/users/{id}");

        expect(generator.generate(route, { id: 25 })).toBe("/users/25");
    });

    it("should generate a URL with multiple parameters", () => {
        const route = createRoute("/users/{userId}/posts/{postId}");

        expect(
            generator.generate(route, {
                userId: 10,
                postId: 50
            })
        ).toBe("/users/10/posts/50");
    });

    it("should encode special characters in parameters", () => {
        const route = createRoute("/users/{name}");

        expect(
            generator.generate(route, { name: "John Doe" })
        ).toBe("/users/John%20Doe");
    });

    it("should reject missing parameters", () => {
        const route = createRoute("/users/{id}");

        expect(() => generator.generate(route)).toThrow(
            "Missing route parameter: id"
        );
    });

    it("should reject unexpected parameters", () => {
        const route = createRoute("/users/{id}");

        expect(() => generator.generate(route, {
            id: 25,
            extra: "value"
        })).toThrow("Unexpected route parameter: extra");
    });

    it("should reject inherited route parameters", () => {
        const route = createRoute("/users/{id}");

        const parameters = Object.create({
            id: 25
        }) as Record<string, string | number>;

        expect(() => generator.generate(route, parameters)).toThrow(
            "Missing route parameter: id"
        );
    });

    it.each([
        ["", "empty value"],
        ["/admin", "forward slash"],
        ["\\admin", "backslash"],
        ["admin\nuser", "newline character"],
        ["admin\u0000user", "null byte"],
        ["admin\u007Fuser", "delete control character"],
        ["\uD800", "invalid Unicode surrogate"]
    ])("should reject unsafe parameter values: %s (%s)", (value) => {
        const route = createRoute("/users/{id}");

        expect(() => {
            generator.generate(route, { id: value });
        }).toThrow();
    });

    it.each([
        [NaN, "NaN"],
        [Infinity, "Infinity"],
        [-Infinity, "-Infinity"]
    ])("should reject invalid numeric values: %s", (value) => {
        const route = createRoute("/users/{id}");

        expect(() => {
            generator.generate(route, { id: value });
        }).toThrow();
    });

    it("should accept zero as a valid numeric parameter", () => {
        const route = createRoute("/users/{id}");

        expect(generator.generate(route, { id: 0 })).toBe("/users/0");
    });


    it("should generate URL when parameters satisfy constraints", () => {
        const generator = new RouteUrlGenerator();

        const route: RouteDefinition = {
            method: "GET",
            path: "/users/{id}",
            handler: () => { },
            constraints: {
                id: (value) => /^\d+$/.test(value)
            }
        };

        expect(generator.generate(route, { id: 123 }))
            .toBe("/users/123");
    });

    it("should reject URL generation when parameters violate constraints", () => {
        const generator = new RouteUrlGenerator();

        const route: RouteDefinition = {
            method: "GET",
            path: "/users/{id}",
            handler: () => { },
            constraints: {
                id: (value) => /^\d+$/.test(value)
            }
        };

        expect(() => generator.generate(route, { id: "abc" }))
            .toThrow("Route parameters do not satisfy constraints.");
    });


    it("should validate multiple route parameter constraints", () => {
        const generator = new RouteUrlGenerator();

        const route: RouteDefinition = {
            method: "GET",
            path: "/users/{id}/posts/{postId}",
            handler: () => { },
            constraints: {
                id: (value) => /^\d+$/.test(value),
                postId: (value) => /^\d+$/.test(value)
            }
        };

        expect(
            generator.generate(route, {
                id: 10,
                postId: 25
            })
        ).toBe("/users/10/posts/25");

        expect(() =>
            generator.generate(route, {
                id: 10,
                postId: "invalid"
            })
        ).toThrow("Route parameters do not satisfy constraints.");
    });
});