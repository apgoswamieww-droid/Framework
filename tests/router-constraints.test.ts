import { describe, expect, it } from "vitest";
import { Router } from "../packages/router/src/index.js";

describe("Router Constraints Integration", () => {
    it("should match a route with a valid parameter constraint", () => {
        const router = new Router();

        router.get(
            "/users/{id}",
            () => { },
            undefined,
            undefined,
            {
                id: (value) => /^\d+$/.test(value)
            }
        );

        const result = router.match("GET", "/users/123");

        expect(result).toBeDefined();
        expect(result?.params.id).toBe("123");
    });

    it("should reject a route with an invalid parameter constraint", () => {
        const router = new Router();

        router.get(
            "/users/{id}",
            () => { },
            undefined,
            undefined,
            {
                id: (value) => /^\d+$/.test(value)
            }
        );

        const result = router.match("GET", "/users/abc");

        expect(result).toBeUndefined();
    });

    it("should reject constraints for unknown route parameters", () => {
        const router = new Router();

        expect(() => {
            router.get(
                "/users/{id}",
                () => { },
                undefined,
                undefined,
                {
                    userId: (value) => /^\d+$/.test(value)
                }
            );
        }).toThrow(
            "Constraint defined for unknown route parameter: userId"
        );
    });

    it("should generate a named route URL with valid constraints", () => {
        const router = new Router();

        router.get(
            "/users/{id}",
            () => { },
            "users.show",
            undefined,
            {
                id: (value) => /^\d+$/.test(value)
            }
        );

        expect(router.url("users.show", { id: 123 }))
            .toBe("/users/123");
    });

    it("should reject a named route URL with invalid constraints", () => {
        const router = new Router();

        router.get(
            "/users/{id}",
            () => { },
            "users.show",
            undefined,
            {
                id: (value) => /^\d+$/.test(value)
            }
        );

        expect(() => router.url("users.show", { id: "abc" }))
            .toThrow("Route parameters do not satisfy constraints.");
    });

});