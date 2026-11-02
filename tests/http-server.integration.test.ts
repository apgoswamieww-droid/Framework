import { afterEach, describe, expect, it } from "vitest";
import { HttpServer } from "../packages/http/src/Server.js";

describe("NOVA HTTP Server Integration", () => {
    let server: HttpServer | undefined;

    afterEach(async () => {
        await server?.stop();
        server = undefined;
    });

    it("should handle a real HTTP request", async () => {
        server = new HttpServer((request, response) => {
            response
                .status(200)
                .send(`Hello from ${request.method} ${request.path}`);
        });

        await server.start(0);

        const address = server.getAddress();

        if (!address || typeof address === "string") {
            throw new Error("Could not determine server address.");
        }

        const result = await fetch(
            `http://127.0.0.1:${address.port}/users`
        );

        expect(result.status).toBe(200);
        expect(await result.text()).toBe("Hello from GET /users");
    });

    it("should return JSON with the correct content type", async () => {
        server = new HttpServer((_request, response) => {
            response.status(201).json({
                success: true,
                framework: "NOVA"
            });
        });

        await server.start(0);

        const address = server.getAddress();

        if (!address || typeof address === "string") {
            throw new Error("Could not determine server address.");
        }

        const result = await fetch(
            `http://127.0.0.1:${address.port}/api`
        );

        expect(result.status).toBe(201);
        expect(result.headers.get("content-type")).toContain(
            "application/json"
        );

        expect(await result.json()).toEqual({
            success: true,
            framework: "NOVA"
        });
    });

    it("should handle asynchronous handler errors safely", async () => {
        server = new HttpServer(async () => {
            throw new Error("Sensitive database details");
        });

        await server.start(0);

        const address = server.getAddress();

        if (!address || typeof address === "string") {
            throw new Error("Could not determine server address.");
        }

        const result = await fetch(
            `http://127.0.0.1:${address.port}/error`
        );

        const body = await result.text();

        expect(result.status).toBe(500);

        expect(body).toBe(
            '{"error":"Internal Server Error"}'
        );

        expect(body).not.toContain("Sensitive database details");
    });

    it.each(["GET", "POST", "PUT", "PATCH", "DELETE"])(
        "should handle %s requests",
        async (method) => {
            server = new HttpServer((request, response) => {
                response.json({
                    method: request.method,
                    path: request.path,
                    page: request.getQuery("page")
                });
            });

            await server.start(0);

            const address = server.getAddress();

            if (!address || typeof address === "string") {
                throw new Error("Could not determine server address.");
            }

            const result = await fetch(
                `http://127.0.0.1:${address.port}/users?page=2`,
                { method }
            );

            expect(result.status).toBe(200);

            expect(await result.json()).toEqual({
                method,
                path: "/users",
                page: "2"
            });
        }
    );

    it("should return 400 for invalid JSON", async () => {
        server = new HttpServer(async (request, response) => {
            const data = await request.json();

            response.json(data);
        });

        await server.start(0);

        const address = server.getAddress();

        if (!address || typeof address === "string") {
            throw new Error("Could not determine server address.");
        }

        const result = await fetch(
            `http://127.0.0.1:${address.port}/api`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: "{invalid json}"
            }
        );

        expect(result.status).toBe(400);

        expect(await result.json()).toEqual({
            error: "Invalid JSON payload."
        });
    });

    it("should return 413 for oversized request body", async () => {
        server = new HttpServer(async (request, response) => {
            const data = await request.json(5);

            response.json(data);
        });

        await server.start(0);

        const address = server.getAddress();

        if (!address || typeof address === "string") {
            throw new Error("Could not determine server address.");
        }

        const result = await fetch(
            `http://127.0.0.1:${address.port}/api`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    message: "This is a large request"
                })
            }
        );

        expect(result.status).toBe(413);

        expect(await result.json()).toEqual({
            error: "Request body exceeds the allowed size."
        });
    });

    it("should return 415 for unsupported content type", async () => {
        server = new HttpServer(async (request, response) => {
            const data = await request.json();

            response.json(data);
        });

        await server.start(0);

        const address = server.getAddress();

        if (!address || typeof address === "string") {
            throw new Error("Could not determine server address.");
        }

        const result = await fetch(
            `http://127.0.0.1:${address.port}/api`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "text/plain"
                },
                body: "Hello NOVA"
            }
        );

        expect(result.status).toBe(415);

        expect(await result.json()).toEqual({
            error: "Unsupported Media Type. Expected JSON."
        });
    });

    it("should return 204 with an empty response body", async () => {
        server = new HttpServer((_request, response) => {
            response.noContent();
        });

        await server.start(0);

        const address = server.getAddress();

        if (!address || typeof address === "string") {
            throw new Error("Could not determine server address.");
        }

        const result = await fetch(
            `http://127.0.0.1:${address.port}/users/1`
        );

        expect(result.status).toBe(204);
        expect(await result.text()).toBe("");
        expect(result.headers.get("content-type")).toBeNull();
    });

        it("should return a 302 redirect with Location header", async () => {
        server = new HttpServer((_request, response) => {
            response.redirect("/login");
        });

        await server.start(0);

        const address = server.getAddress();

        if (!address || typeof address === "string") {
            throw new Error("Could not determine server address.");
        }

        const result = await fetch(
            `http://127.0.0.1:${address.port}/dashboard`,
            {
                redirect: "manual"
            }
        );

        expect(result.status).toBe(302);
        expect(result.headers.get("location")).toBe("/login");
        expect(await result.text()).toBe("");
    });

    it.each([301, 303, 307, 308] as const)(
        "should support HTTP redirect status %s",
        async (statusCode) => {
            server = new HttpServer((_request, response) => {
                response.redirect("/dashboard", statusCode);
            });

            await server.start(0);

            const address = server.getAddress();

            if (!address || typeof address === "string") {
                throw new Error("Could not determine server address.");
            }

            const result = await fetch(
                `http://127.0.0.1:${address.port}/login`,
                {
                    redirect: "manual"
                }
            );

            expect(result.status).toBe(statusCode);
            expect(result.headers.get("location")).toBe("/dashboard");
        }
    );

        it("should block external redirect URLs", async () => {
        server = new HttpServer((_request, response) => {
            response.redirect("https://evil.com");
        });

        await server.start(0);

        const address = server.getAddress();

        if (!address || typeof address === "string") {
            throw new Error("Could not determine server address.");
        }

        const result = await fetch(
            `http://127.0.0.1:${address.port}/redirect`,
            {
                redirect: "manual"
            }
        );

        expect(result.status).toBe(500);
        expect(result.headers.get("location")).toBeNull();

        expect(await result.json()).toEqual({
            error: "Internal Server Error"
        });
    });
});