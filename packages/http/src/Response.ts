import type { ServerResponse } from "node:http";

export class Response {
  constructor(
    private readonly outgoing: ServerResponse
  ) { }

  public status(code: number): this {
    if (
      !Number.isInteger(code) ||
      code < 100 ||
      code > 599
    ) {
      throw new RangeError("Invalid HTTP status code.");
    }

    this.outgoing.statusCode = code;

    return this;
  }

  public noContent(): void {
    if (this.outgoing.writableEnded) {
      return;
    }

    this.outgoing.statusCode = 204;

    this.outgoing.removeHeader("Content-Type");
    this.outgoing.removeHeader("Content-Length");

    this.outgoing.end();
  }

  public header(name: string, value: string): this {
    this.outgoing.setHeader(name, value);
    return this;
  }

  public send(body: string): void {
    if (this.outgoing.writableEnded) {
      return;
    }

    if (!this.outgoing.hasHeader("Content-Type")) {
      this.outgoing.setHeader(
        "Content-Type",
        "text/plain; charset=utf-8"
      );
    }

    this.outgoing.end(body);
  }

  public json(data: unknown): void {
    if (this.outgoing.writableEnded) {
      return;
    }

    this.outgoing.setHeader(
      "Content-Type",
      "application/json; charset=utf-8"
    );

    this.outgoing.end(JSON.stringify(data));
  }

  public html(content: string): void {
    if (this.outgoing.writableEnded) {
      return;
    }

    this.outgoing.setHeader(
      "Content-Type",
      "text/html; charset=utf-8"
    );

    this.outgoing.end(content);
  }

  public getRawResponse(): ServerResponse {
    return this.outgoing;
  }

  public redirect(
    location: string,
    statusCode: 301 | 302 | 303 | 307 | 308 = 302
  ): void {
    if (this.outgoing.writableEnded) {
      return;
    }

    if (
      typeof location !== "string" ||
      location.length === 0 ||
      location.trim() !== location ||
      /[\u0000-\u001F\u007F]/.test(location) ||
      !location.startsWith("/") ||
      location.startsWith("//") ||
      location.includes("\\")
    ) {
      throw new TypeError("Invalid redirect location.");
    }

    const allowedStatusCodes = [301, 302, 303, 307, 308];

    if (!allowedStatusCodes.includes(statusCode)) {
      throw new RangeError("Invalid redirect status code.");
    }

    let parsedUrl: URL;

    try {
      parsedUrl = new URL(location, "http://nova.internal");
    } catch {
      throw new TypeError("Invalid redirect location.");
    }

    if (parsedUrl.origin !== "http://nova.internal") {
      throw new TypeError("Invalid redirect location.");
    }

    this.outgoing.statusCode = statusCode;
    this.outgoing.setHeader("Location", location);
    this.outgoing.end();
  }
}