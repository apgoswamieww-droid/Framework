
import { describe, expect, it } from "vitest";

import { RouteMatcher } from "../packages/router/src/RouteMatcher.js";

describe("RouteMatcher", () => {
    const matcher = new RouteMatcher();

    it("should match an exact route", () => {
        const result = matcher.match(
            [
                {
                    method: "GET",
                    path: "/users",
                    handler: () => { }
                }
            ],
            "GET",
            "/users"
        );

        expect(result).toBeDefined();
        expect(result?.params).toEqual({});
    });

    it("should match a dynamic route parameter", () => {
        const result = matcher.match(
            [
                {
                    method: "GET",
                    path: "/users/{id}",
                    handler: () => { }
                }
            ],
            "GET",
            "/users/25"
        );

        expect(result?.params).toEqual({
            id: "25"
        });
    });

    it("should match multiple dynamic parameters", () => {
        const result = matcher.match(
            [
                {
                    method: "GET",
                    path: "/users/{userId}/posts/{postId}",
                    handler: () => { }
                }
            ],
            "GET",
            "/users/10/posts/50"
        );

        expect(result?.params).toEqual({
            userId: "10",
            postId: "50"
        });
    });

    it("should not match different HTTP methods", () => {
        const result = matcher.match(
            [
                {
                    method: "GET",
                    path: "/users",
                    handler: () => { }
                }
            ],
            "POST",
            "/users"
        );

        expect(result).toBeUndefined();
    });

    it("should not match different segment counts", () => {
        const result = matcher.match(
            [
                {
                    method: "GET",
                    path: "/users/{id}",
                    handler: () => { }
                }
            ],
            "GET",
            "/users/25/profile"
        );

        expect(result).toBeUndefined();
    });

    it("should decode URL parameters", () => {
        const result = matcher.match(
            [
                {
                    method: "GET",
                    path: "/users/{name}",
                    handler: () => { }
                }
            ],
            "GET",
            "/users/Amrut%20Goswami"
        );

        expect(result?.params.name).toBe("Amrut Goswami");
    });

    it("should reject malformed URL encoding", () => {
        const result = matcher.match(
            [
                {
                    method: "GET",
                    path: "/users/{id}",
                    handler: () => { }
                }
            ],
            "GET",
            "/users/%E0%A4%A"
        );

        expect(result).toBeUndefined();
    });

    it("should safely handle a __proto__ route parameter", () => {
        const result = matcher.match(
            [
                {
                    method: "GET",
                    path: "/users/{__proto__}",
                    handler: () => { }
                }
            ],
            "GET",
            "/users/attacker"
        );

        expect(result).toBeDefined();

        if (!result) {
            throw new Error("Expected route to match");
        }

        expect(Object.hasOwn(result.params, "__proto__")).toBe(true);
        expect(result.params["__proto__"]).toBe("attacker");

        expect(Object.getPrototypeOf(result.params)).toBe(Object.prototype);

        expect(
            ({} as Record<string, unknown>)["attacker"]
        ).toBeUndefined();
    });

    it.each([
        ["/users/%2Fadmin", "encoded forward slash"],
        ["/users/%5Cadmin", "encoded backslash"],
        ["/users/%00admin", "null byte"],
        ["/users/%0Aadmin", "newline character"]
    ])("should reject %s (%s)", (pathname) => {
        const result = matcher.match(
            [
                {
                    method: "GET",
                    path: "/users/{id}",
                    handler: () => { }
                }
            ],
            "GET",
            pathname
        );

        expect(result).toBeUndefined();
    });

    it.each(["constructor", "prototype"])(
        "should safely handle a %s route parameter",
        (parameterName) => {
            const result = matcher.match(
                [
                    {
                        method: "GET",
                        path: `/users/{${parameterName}}`,
                        handler: () => { }
                    }
                ],
                "GET",
                "/users/attacker"
            );

            expect(result).toBeDefined();

            if (!result) {
                throw new Error("Expected route to match");
            }

            expect(Object.hasOwn(result.params, parameterName)).toBe(true);
            expect(result.params[parameterName]).toBe("attacker");
            expect(Object.getPrototypeOf(result.params)).toBe(Object.prototype);
        }
    );

});
