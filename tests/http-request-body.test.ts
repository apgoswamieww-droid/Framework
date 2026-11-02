import { describe, expect, it } from "vitest";
import { Readable } from "node:stream";
import type { IncomingMessage } from "node:http";
import { Request } from "../packages/http/src/Request.js";

function createMockRequestWithStream(
  stream: Readable,
  headers: Record<string, string> = {}
) {
  const incoming = Object.assign(stream, {
    method: "POST",
    url: "/api/users",
    headers: {
      "content-type": "application/json",
      ...headers
    }
  }) as unknown as IncomingMessage;

  return {
    request: new Request(incoming),
    stream
  };
}

function createMockRequest(
  body: string,
  headers: Record<string, string> = {}
): Request {
  return createMockRequestWithStream(
    Readable.from([Buffer.from(body)]),
    headers
  ).request;
}

describe("NOVA HTTP Request Body", () => {

  it("should read plain text body", async () => {
    const request = createMockRequest("Hello NOVA");

    expect(await request.text()).toBe("Hello NOVA");
  });

  it("should parse JSON body", async () => {
    const request = createMockRequest(
      '{"name":"NOVA","version":"0.1.0"}'
    );

    expect(await request.json()).toEqual({
      name: "NOVA",
      version: "0.1.0"
    });
  });

  it("should return an empty string for an empty body", async () => {
    const request = createMockRequest("");

    expect(await request.text()).toBe("");
  });

  it("should reject invalid JSON", async () => {
    const request = createMockRequest("{invalid json}");

    await expect(request.json()).rejects.toThrow();
  });

  it("should reject a body exceeding the size limit", async () => {
    const request = createMockRequest("This body is too large");

    await expect(request.readBody(5)).rejects.toThrow(
      "Request body exceeds the allowed size."
    );
  });

  it("should reject an invalid body size limit", async () => {
    const request = createMockRequest("Hello");

    await expect(request.readBody(0)).rejects.toThrow(
      "Invalid request body size limit."
    );
  });

  it("should reject an oversized Content-Length header", async () => {
    const request = createMockRequest("Hello", {
      "content-length": "100"
    });

    await expect(request.readBody(10)).rejects.toThrow(
      "Request body exceeds the allowed size."
    );
  });

  it("should reuse the same body reading promise", () => {
    const request = createMockRequest("Hello NOVA");

    const first = request.readBody();
    const second = request.readBody();

    expect(first).toBe(second);
  });

  it("should accept JSON with charset parameter", async () => {
    const request = createMockRequest(
      '{"name":"NOVA"}',
      {
        "content-type": "application/json; charset=utf-8"
      }
    );

    expect(await request.json()).toEqual({
      name: "NOVA"
    });
  });

  it("should accept vendor-specific JSON content types", async () => {
    const request = createMockRequest(
      '{"success":true}',
      {
        "content-type": "application/vnd.api+json"
      }
    );

    expect(await request.json()).toEqual({
      success: true
    });
  });

  it("should reject JSON parsing with text/plain content type", async () => {
    const request = createMockRequest(
      '{"name":"NOVA"}',
      {
        "content-type": "text/plain"
      }
    );

    await expect(request.json()).rejects.toMatchObject({
      statusCode: 415,
      message: "Unsupported Media Type. Expected JSON."
    });
  });

  it("should handle request stream errors safely", async () => {
    const stream = new Readable({
      read() { }
    });

    const { request } = createMockRequestWithStream(stream);

    const bodyPromise = request.readBody();

    stream.destroy(new Error("Internal stream error"));

    await expect(bodyPromise).rejects.toMatchObject({
      statusCode: 400,
      message: "Unable to read request body."
    });
  });

  it("should reject an interrupted request", async () => {
    const stream = new Readable({
      read() { }
    });

    const { request } = createMockRequestWithStream(stream);

    const bodyPromise = request.readBody();

    stream.emit("aborted");

    await expect(bodyPromise).rejects.toMatchObject({
      statusCode: 400,
      message: "Request body was interrupted."
    });
  });

  it("should drain the stream after exceeding the body size limit", async () => {
    const stream = Readable.from([
      Buffer.from("123456"),
      Buffer.from("remaining data")
    ]);

    const { request } = createMockRequestWithStream(stream);

    const bodyPromise = request.readBody(5);

    await expect(bodyPromise).rejects.toMatchObject({
      statusCode: 413,
      message: "Request body exceeds the allowed size."
    });

    if (!stream.readableEnded) {
      await new Promise<void>((resolve, reject) => {
        stream.once("end", resolve);
        stream.once("error", reject);
      });
    }

    expect(stream.readableEnded).toBe(true);
  });

  it("should reject an invalid Content-Length header", async () => {
    const request = createMockRequest("Hello", {
      "content-length": "invalid"
    });

    await expect(request.readBody()).rejects.toMatchObject({
      statusCode: 400,
      message: "Invalid Content-Length header."
    });
  });

  it("should accept a zero Content-Length header", async () => {
    const request = createMockRequest("", {
      "content-length": "0"
    });

    const body = await request.readBody();

    expect(body.length).toBe(0);
  });

  it("should accept a body within the exact Content-Length limit", async () => {
    const request = createMockRequest("Hello", {
      "content-length": "5"
    });

    const body = await request.readBody(5);

    expect(body.toString("utf8")).toBe("Hello");
  });

  it.each(["1e2", "+100", "-1", "10.5", " 10 "])(
    "should reject non-standard Content-Length format: %s",
    async (contentLength) => {
      const request = createMockRequest("Hello", {
        "content-length": contentLength
      });

      await expect(request.readBody()).rejects.toMatchObject({
        statusCode: 400,
        message: "Invalid Content-Length header."
      });
    }
  );

  it("should reject a body that does not match Content-Length", async () => {
    const request = createMockRequest("Hello", {
      "content-length": "10"
    });

    await expect(request.readBody()).rejects.toMatchObject({
      statusCode: 400,
      message: "Request body length does not match Content-Length."
    });
  });

});