import { describe, expect, it } from "vitest";

import { RouteMiddlewareRunner } from "../packages/router/src/RouteMiddlewareRunner.js";

import type {
    RouteContext,
    RouteHandler
} from "../packages/router/src/RouteHandler.js";

import type {
    RouteMiddleware
} from "../packages/router/src/RouteMiddleware.js";

describe("RouteMiddlewareRunner", () => {
    const context: RouteContext = {
        params: {},
        query: {}
    };

    it("should execute middleware in registration order", async () => {
        const runner = new RouteMiddlewareRunner();
        const executionOrder: string[] = [];

        const first: RouteMiddleware = async (_context, next) => {
            executionOrder.push("first-before");
            await next();
            executionOrder.push("first-after");
        };

        const second: RouteMiddleware = async (_context, next) => {
            executionOrder.push("second-before");
            await next();
            executionOrder.push("second-after");
        };

        const handler: RouteHandler = () => {
            executionOrder.push("handler");
        };

        await runner.run(context, [first, second], handler);

        expect(executionOrder).toEqual([
            "first-before",
            "second-before",
            "handler",
            "second-after",
            "first-after"
        ]);
    });

    it("should execute handler when no middleware exists", async () => {
        const runner = new RouteMiddlewareRunner();
        let handlerExecuted = false;

        const handler: RouteHandler = () => {
            handlerExecuted = true;
        };

        await runner.run(context, [], handler);

        expect(handlerExecuted).toBe(true);
    });

    it("should reject multiple next() calls", async () => {
        const runner = new RouteMiddlewareRunner();

        const middleware: RouteMiddleware = async (_context, next) => {
            await next();
            await next();
        };

        const handler: RouteHandler = () => { };

        await expect(
            runner.run(context, [middleware], handler)
        ).rejects.toThrow("Middleware next() called multiple times.");
    });

    it("should propagate middleware errors", async () => {
        const runner = new RouteMiddlewareRunner();

        const middleware: RouteMiddleware = async () => {
            throw new Error("Middleware failed.");
        };

        const handler: RouteHandler = () => { };

        await expect(
            runner.run(context, [middleware], handler)
        ).rejects.toThrow("Middleware failed.");
    });

    it("should stop execution when middleware does not call next()", async () => {
        const runner = new RouteMiddlewareRunner();

        let handlerExecuted = false;

        const middleware: RouteMiddleware = () => {
            // Intentionally do not call next().
        };

        const handler: RouteHandler = () => {
            handlerExecuted = true;
        };

        await runner.run(context, [middleware], handler);

        expect(handlerExecuted).toBe(false);
    });

});