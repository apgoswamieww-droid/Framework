import { describe, expect, it, vi } from "vitest";
import type { ServerResponse } from "node:http";
import { Response } from "../packages/http/src/Response.js";

function createMockResponse(options: {
  writableEnded?: boolean;
} = {}) {
  const headers = new Map<string, string>();

  const outgoing = {
    statusCode: 200,
    writableEnded: options.writableEnded ?? false,

    setHeader: vi.fn((name: string, value: string) => {
      headers.set(name.toLowerCase(), value);
    }),

    hasHeader: vi.fn((name: string) => {
      return headers.has(name.toLowerCase());
    }),

    removeHeader: vi.fn((name: string) => {
      headers.delete(name.toLowerCase());
    }),

    end: vi.fn()
  } as unknown as ServerResponse;



  return { outgoing, headers };
}

describe("NOVA HTTP Response", () => {
  it("should set the HTTP status code", () => {
    const { outgoing } = createMockResponse();
    const response = new Response(outgoing);

    response.status(201);

    expect(outgoing.statusCode).toBe(201);
  });

  it("should set a response header", () => {
    const { outgoing, headers } = createMockResponse();
    const response = new Response(outgoing);

    response.header("X-Powered-By", "NOVA");

    expect(headers.get("x-powered-by")).toBe("NOVA");
  });

  it("should send plain text", () => {
    const { outgoing } = createMockResponse();
    const response = new Response(outgoing);

    response.send("Hello NOVA");

    expect(outgoing.end).toHaveBeenCalledWith("Hello NOVA");
    expect(outgoing.setHeader).toHaveBeenCalledWith(
      "Content-Type",
      "text/plain; charset=utf-8"
    );
  });

  it("should send JSON data", () => {
    const { outgoing } = createMockResponse();
    const response = new Response(outgoing);

    response.json({ message: "Hello NOVA" });

    expect(outgoing.end).toHaveBeenCalledWith(
      '{"message":"Hello NOVA"}'
    );
  });

  it("should set JSON content type", () => {
    const { outgoing } = createMockResponse();
    const response = new Response(outgoing);

    response.json({ success: true });

    expect(outgoing.setHeader).toHaveBeenCalledWith(
      "Content-Type",
      "application/json; charset=utf-8"
    );
  });

  it("should send HTML content", () => {
    const { outgoing } = createMockResponse();
    const response = new Response(outgoing);

    response.html("<h1>Hello NOVA</h1>");

    expect(outgoing.end).toHaveBeenCalledWith(
      "<h1>Hello NOVA</h1>"
    );
  });

  it("should set HTML content type", () => {
    const { outgoing } = createMockResponse();
    const response = new Response(outgoing);

    response.html("<h1>Hello</h1>");

    expect(outgoing.setHeader).toHaveBeenCalledWith(
      "Content-Type",
      "text/html; charset=utf-8"
    );
  });

  it("should not send a response twice", () => {
    const { outgoing } = createMockResponse({
      writableEnded: true
    });

    const response = new Response(outgoing);

    response.send("First");
    response.json({ message: "Second" });
    response.html("<h1>Third</h1>");

    expect(outgoing.end).not.toHaveBeenCalled();
  });

  it("should return the original Node.js response", () => {
    const { outgoing } = createMockResponse();
    const response = new Response(outgoing);

    expect(response.getRawResponse()).toBe(outgoing);
  });


  it.each([0, 99, 600, 999, 200.5])(
    "should reject invalid status code %s",
    (code) => {
      const { outgoing } = createMockResponse();
      const response = new Response(outgoing);

      expect(() => response.status(code)).toThrow(
        "Invalid HTTP status code."
      );
    }
  );

  it("should support method chaining", () => {
    const { outgoing, headers } = createMockResponse();
    const response = new Response(outgoing);

    const result = response
      .status(201)
      .header("X-Powered-By", "NOVA");

    expect(result).toBe(response);
    expect(outgoing.statusCode).toBe(201);
    expect(headers.get("x-powered-by")).toBe("NOVA");
  });

  it("should set status code to 204", () => {
    const { outgoing } = createMockResponse();
    const response = new Response(outgoing);

    response.noContent();

    expect(outgoing.statusCode).toBe(204);
  });

  it("should remove Content-Type header", () => {
    const { outgoing, headers } = createMockResponse();
    const response = new Response(outgoing);

    response.header("Content-Type", "application/json");

    response.noContent();

    expect(headers.has("content-type")).toBe(false);
  });

  it("should remove Content-Length header", () => {
    const { outgoing, headers } = createMockResponse();
    const response = new Response(outgoing);

    response.header("Content-Length", "100");

    response.noContent();

    expect(headers.has("content-length")).toBe(false);
  });

  it("should end response without sending a body", () => {
    const { outgoing } = createMockResponse();
    const response = new Response(outgoing);

    response.noContent();

    expect(outgoing.end).toHaveBeenCalledWith();
  });

  it("should not send no-content response twice", () => {
    const { outgoing } = createMockResponse({
      writableEnded: true
    });

    const response = new Response(outgoing);

    response.noContent();

    expect(outgoing.end).not.toHaveBeenCalled();
  });

  it("should redirect with default 302 status", () => {
    const { outgoing, headers } = createMockResponse();
    const response = new Response(outgoing);

    response.redirect("/login");

    expect(outgoing.statusCode).toBe(302);
    expect(headers.get("location")).toBe("/login");
    expect(outgoing.end).toHaveBeenCalledWith();
  });

  it.each([301, 303, 307, 308] as const)(
    "should support redirect status code %s",
    (statusCode) => {
      const { outgoing } = createMockResponse();
      const response = new Response(outgoing);

      response.redirect("/dashboard", statusCode);

      expect(outgoing.statusCode).toBe(statusCode);
    }
  );

  it("should reject an empty redirect location", () => {
    const { outgoing } = createMockResponse();
    const response = new Response(outgoing);

    expect(() => response.redirect("")).toThrow(
      "Invalid redirect location."
    );
  });

  it("should reject redirect locations containing CRLF characters", () => {
    const { outgoing } = createMockResponse();
    const response = new Response(outgoing);

    expect(() => response.redirect("/login\r\nX-Injected: true")).toThrow(
      "Invalid redirect location."
    );
  });

  it("should reject redirect locations containing control characters", () => {
    const { outgoing } = createMockResponse();
    const response = new Response(outgoing);

    expect(() => response.redirect("/login\u0000")).toThrow(
      "Invalid redirect location."
    );
  });

  it("should not redirect if response has already ended", () => {
    const { outgoing } = createMockResponse({
      writableEnded: true
    });

    const response = new Response(outgoing);

    response.redirect("/login");

    expect(outgoing.statusCode).toBe(200);
    expect(outgoing.setHeader).not.toHaveBeenCalled();
    expect(outgoing.end).not.toHaveBeenCalled();
  });

  it("should allow local redirect paths", () => {
    const { outgoing, headers } = createMockResponse();
    const response = new Response(outgoing);

    response.redirect("/dashboard");

    expect(headers.get("location")).toBe("/dashboard");
    expect(outgoing.statusCode).toBe(302);
  });

  it("should allow local redirect paths with query parameters", () => {
    const { outgoing, headers } = createMockResponse();
    const response = new Response(outgoing);

    response.redirect("/users?page=2");

    expect(headers.get("location")).toBe("/users?page=2");
  });

  it.each([
    "https://evil.com",
    "http://evil.com",
    "//evil.com",
    "///evil.com",
    "\\\\evil.com",
    "/\\evil.com"
  ])(
    "should reject external or unsafe redirect URL: %s",
    (location) => {
      const { outgoing } = createMockResponse();
      const response = new Response(outgoing);

      expect(() => response.redirect(location)).toThrow(
        "Invalid redirect location."
      );

      expect(outgoing.end).not.toHaveBeenCalled();
      expect(outgoing.setHeader).not.toHaveBeenCalled();
    }
  );

  it("should reject redirect locations with leading or trailing whitespace", () => {
    const { outgoing } = createMockResponse();
    const response = new Response(outgoing);

    expect(() => response.redirect(" /login")).toThrow(
      "Invalid redirect location."
    );

    expect(() => response.redirect("/login ")).toThrow(
      "Invalid redirect location."
    );
  });

    it.each([200, 399, 600, 302.5])(
    "should reject invalid redirect status code %s",
    (statusCode) => {
      const { outgoing } = createMockResponse();
      const response = new Response(outgoing);

      expect(() =>
        response.redirect("/login", statusCode as never)
      ).toThrow("Invalid redirect status code.");

      expect(outgoing.end).not.toHaveBeenCalled();
      expect(outgoing.setHeader).not.toHaveBeenCalled();
    }
  );

});