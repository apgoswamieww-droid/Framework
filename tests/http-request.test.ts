import { describe, expect, it } from "vitest";
import type { IncomingMessage } from "node:http";
import { Request } from "../packages/http/src/Request.js";
import { HttpError } from "../packages/http/src/HttpError.js";

function createMockRequest(
  options: {
    method?: string;
    url?: string;
    headers?: Record<string, string | string[]>;
  } = {}
): IncomingMessage {
  return {
    method: options.method,
    url: options.url,
    headers: options.headers ?? {}
  } as unknown as IncomingMessage;
}

describe("NOVA HTTP Request", () => {
  it("should read the HTTP method", () => {
    const request = new Request(
      createMockRequest({ method: "POST" })
    );

    expect(request.method).toBe("POST");
  });

  it("should default to GET when method is missing", () => {
    const request = new Request(createMockRequest());

    expect(request.method).toBe("GET");
  });

  it("should read the request pathname", () => {
    const request = new Request(
      createMockRequest({ url: "/users/profile" })
    );

    expect(request.path).toBe("/users/profile");
  });

  it("should read query parameters", () => {
    const request = new Request(
      createMockRequest({
        url: "/users?page=2&status=active"
      })
    );

    expect(request.getQuery("page")).toBe("2");
    expect(request.getQuery("status")).toBe("active");
  });

  it("should return null for missing query parameters", () => {
    const request = new Request(
      createMockRequest({ url: "/users" })
    );

    expect(request.getQuery("missing")).toBeNull();
  });

  it("should read request headers", () => {
    const request = new Request(
      createMockRequest({
        headers: {
          "content-type": "application/json"
        }
      })
    );

    expect(request.getHeader("content-type")).toBe(
      "application/json"
    );
  });

  it("should join multiple header values", () => {
    const request = new Request(
      createMockRequest({
        headers: {
          "x-custom-header": ["value1", "value2"]
        }
      })
    );

    expect(request.getHeader("x-custom-header")).toBe(
      "value1, value2"
    );
  });

  it("should return the original Node.js request", () => {
    const incoming = createMockRequest();
    const request = new Request(incoming);

    expect(request.getRawRequest()).toBe(incoming);
  });

  it("should reject an invalid request URL with HTTP 400", () => {
    const request = () =>
      new Request(
        createMockRequest({
          url: "http://[invalid"
        })
      );

    try {
      request();
      throw new Error("Expected request construction to fail.");
    } catch (error) {
      expect(error).toBeInstanceOf(HttpError);
      expect(error).toMatchObject({
        statusCode: 400,
        message: "Invalid request URL."
      });
    }
  });
});