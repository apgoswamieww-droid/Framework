import { describe, expect, it } from "vitest";
import { HttpError } from "../packages/http/src/HttpError.js";

describe("NOVA HTTP Error", () => {
  it("should create a valid HTTP error", () => {
    const error = new HttpError(400, "Bad Request");

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(HttpError);
    expect(error.statusCode).toBe(400);
    expect(error.message).toBe("Bad Request");
    expect(error.name).toBe("HttpError");
  });

  it.each([399, 600, 999, 400.5, 200])(
    "should reject invalid HTTP error status code %s",
    (code) => {
      expect(() => new HttpError(code, "Invalid Error")).toThrow(
        "Invalid HTTP error status code."
      );
    }
  );

  it("should support 413 Payload Too Large", () => {
    const error = new HttpError(413, "Payload Too Large");

    expect(error.statusCode).toBe(413);
  });

  it("should support 500 Internal Server Error", () => {
    const error = new HttpError(500, "Internal Server Error");

    expect(error.statusCode).toBe(500);
  });
});