import { describe, expect, it } from "vitest";

import { RouteConstraintValidator } from "../packages/router/src/RouteConstraintValidator.js";

import type { RouteDefinition } from "../packages/router/src/RouteDefinition.js";

describe("RouteConstraintValidator", () => {
    const validator = new RouteConstraintValidator();

    const createRoute = (
        constraints?: RouteDefinition["constraints"]
    ): RouteDefinition => ({
        method: "GET",
        path: "/users/{id}",
        handler: () => { },
        ...(constraints ? { constraints } : {})
    });

    it("should pass when route has no constraints", () => {
        const route = createRoute();

        expect(
            validator.validate(route, { id: "123" })
        ).toBe(true);
    });

    it("should pass when parameter satisfies constraint", () => {
        const route = createRoute({
            id: (value) => /^\d+$/.test(value)
        });

        expect(
            validator.validate(route, { id: "123" })
        ).toBe(true);
    });

    it("should fail when parameter does not satisfy constraint", () => {
        const route = createRoute({
            id: (value) => /^\d+$/.test(value)
        });

        expect(
            validator.validate(route, { id: "abc" })
        ).toBe(false);
    });

    it("should fail when constrained parameter is missing", () => {
        const route = createRoute({
            id: (value) => /^\d+$/.test(value)
        });

        expect(
            validator.validate(route, {})
        ).toBe(false);
    });

    it("should validate multiple parameter constraints", () => {
        const route = createRoute({
            id: (value) => /^\d+$/.test(value),
            slug: (value) => /^[a-z-]+$/.test(value)
        });

        expect(
            validator.validate(route, {
                id: "123",
                slug: "nova-framework"
            })
        ).toBe(true);

        expect(
            validator.validate(route, {
                id: "abc",
                slug: "nova-framework"
            })
        ).toBe(false);
    });

    it("should propagate constraint errors", () => {
        const route = createRoute({
            id: () => {
                throw new Error("Constraint failed.");
            }
        });

        expect(() =>
            validator.validate(route, { id: "123" })
        ).toThrow("Constraint failed.");
    });

    describe("RouteConstraintValidator - Definition Validation", () => {
        const validator = new RouteConstraintValidator();

        const handler = () => { };

        it("should accept constraints defined for existing route parameters", () => {
            const route: RouteDefinition = {
                method: "GET",
                path: "/users/{id}",
                handler,
                constraints: {
                    id: (value) => /^\d+$/.test(value)
                }
            };

            expect(() => validator.validateDefinition(route)).not.toThrow();
        });

        it("should reject constraints for unknown route parameters", () => {
            const route: RouteDefinition = {
                method: "GET",
                path: "/users/{id}",
                handler,
                constraints: {
                    userId: (value) => /^\d+$/.test(value)
                }
            };

            expect(() => validator.validateDefinition(route)).toThrow(
                "Constraint defined for unknown route parameter: userId"
            );
        });

        it("should accept routes without constraints", () => {
            const route: RouteDefinition = {
                method: "GET",
                path: "/users",
                handler
            };

            expect(() => validator.validateDefinition(route)).not.toThrow();
        });
    });

});