import type { IncomingMessage } from "node:http";
import { HttpError } from "./HttpError.js";

export class Request {
  public readonly method: string;
  public readonly path: string;
  public readonly url: URL;
  public readonly query: URLSearchParams;
  public readonly headers: IncomingMessage["headers"];
  private bodyPromise: Promise<Buffer> | null = null;

  constructor(
    private readonly incoming: IncomingMessage
  ) {
    this.method = incoming.method ?? "GET";
    this.headers = incoming.headers;

    try {
      this.url = new URL(
        incoming.url ?? "/",
        "http://nova.local"
      );
    } catch {
      throw new HttpError(
        400,
        "Invalid request URL."
      );
    }

    this.path = this.url.pathname;
    this.query = this.url.searchParams;
  }

  public getHeader(name: string): string | undefined {
    const value = this.headers[name.toLowerCase()];

    if (Array.isArray(value)) {
      return value.join(", ");
    }

    return value;
  }

  public getQuery(name: string): string | null {
    return this.query.get(name);
  }

  public getRawRequest(): IncomingMessage {
    return this.incoming;
  }

  public readBody(
    maxBytes = 1024 * 1024
  ): Promise<Buffer> {
    if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) {
      return Promise.reject(
        new Error("Invalid request body size limit.")
      );
    }

    if (this.bodyPromise) {
      return this.bodyPromise;
    }

    this.bodyPromise = this.collectBody(maxBytes);

    return this.bodyPromise;
  }

  private async collectBody(maxBytes: number): Promise<Buffer> {
    const contentLength = this.getHeader("content-length");
let declaredLength: number | undefined;
    if (contentLength !== undefined) {
      if (!/^\d+$/.test(contentLength)) {
        this.incoming.resume();

        throw new HttpError(
          400,
          "Invalid Content-Length header."
        );
      }

      declaredLength = Number(contentLength);;

      if (!Number.isSafeInteger(declaredLength)) {
        this.incoming.resume();

        throw new HttpError(
          400,
          "Invalid Content-Length header."
        );
      }

      if (declaredLength > maxBytes) {
        this.incoming.resume();

        throw new HttpError(
          413,
          "Request body exceeds the allowed size."
        );
      }
    }

    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      let totalBytes = 0;
      let settled = false;

      const cleanup = () => {
        this.incoming.removeListener("data", onData);
        this.incoming.removeListener("end", onEnd);
        this.incoming.removeListener("error", onError);
        this.incoming.removeListener("aborted", onAborted);
      };

      const fail = (error: Error) => {
        if (settled) return;

        settled = true;
        chunks.length = 0;
        reject(error);
      };

      const onData = (chunk: Buffer | string) => {
        if (settled) return;

        const buffer = Buffer.isBuffer(chunk)
          ? chunk
          : Buffer.from(chunk);

        totalBytes += buffer.length;

        if (totalBytes > maxBytes) {
          fail(
            new HttpError(
              413,
              "Request body exceeds the allowed size."
            )
          );

          // Continue draining without buffering more data.
          return;
        }

        chunks.push(buffer);
      };

      const onEnd = () => {
        cleanup();

        if (settled) return;

        if (
          contentLength !== undefined &&
          totalBytes !== declaredLength
        ) {
          fail(
            new HttpError(
              400,
              "Request body length does not match Content-Length."
            )
          );

          return;
        }

        settled = true;
        resolve(Buffer.concat(chunks));
      };

      const onError = () => {
        cleanup();

        fail(
          new HttpError(
            400,
            "Unable to read request body."
          )
        );
      };

      const onAborted = () => {
        cleanup();

        fail(
          new HttpError(
            400,
            "Request body was interrupted."
          )
        );
      };

      this.incoming.on("data", onData);
      this.incoming.once("end", onEnd);
      this.incoming.once("error", onError);
      this.incoming.once("aborted", onAborted);
    });
  }

  public async text(maxBytes = 1024 * 1024): Promise<string> {
    const body = await this.readBody(maxBytes);

    return body.toString("utf8");
  }

  public async json<T = unknown>(
    maxBytes = 1024 * 1024
  ): Promise<T> {
    const contentType = this.getHeader("content-type")
      ?.split(";")[0]
      ?.trim()
      .toLowerCase();

    const isJson =
      contentType === "application/json" ||
      (contentType?.startsWith("application/") === true &&
        contentType.endsWith("+json"));

    if (!isJson) {
      throw new HttpError(
        415,
        "Unsupported Media Type. Expected JSON."
      );
    }

    const body = await this.readBody(maxBytes);

    try {
      return JSON.parse(body.toString("utf8")) as T;
    } catch {
      throw new HttpError(400, "Invalid JSON payload.");
    }
  }
}