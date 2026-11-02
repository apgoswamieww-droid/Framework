import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
  type Server as NodeHttpServer
} from "node:http";

import { Request } from "./Request.js";
import { Response } from "./Response.js";
import { HttpError } from "./HttpError.js";

export type HttpHandler = (
  request: Request,
  response: Response
) => void | Promise<void>;

export class HttpServer {
  private server: NodeHttpServer | null = null;

  constructor(
    private readonly handler: HttpHandler
  ) { }

  public start(
    port = 3000,
    host = "127.0.0.1"
  ): Promise<void> {
    if (this.server) {
      throw new Error("HTTP server is already running.");
    }

    const server = createServer(
      {
        maxHeaderSize: 16 * 1024
      },
      (incoming: IncomingMessage, outgoing: ServerResponse) => {
        try {
          const request = new Request(incoming);
          const response = new Response(outgoing);

          Promise.resolve(
            this.handler(request, response)
          ).catch((error: unknown) => {
            this.handleError(outgoing, error);
          });
        } catch (error) {
          this.handleError(outgoing, error);
        }
      }
    );

    // Request timeout: 30 seconds
    server.requestTimeout = 30_000;

    // Headers timeout: 10 seconds
    server.headersTimeout = 10_000;

    // Keep-alive timeout: 5 seconds
    server.keepAliveTimeout = 5_000;

    // Maximum number of request headers
    server.maxHeadersCount = 100;

    this.server = server;

    return new Promise((resolve, reject) => {
      const onError = (error: Error): void => {
        this.server = null;
        reject(error);
      };

      server.once("error", onError);

      server.listen(port, host, () => {
        server.off("error", onError);
        resolve();
      });
    });
  }

  private sendInternalServerError(outgoing: ServerResponse): void {

    if (outgoing.writableEnded || outgoing.destroyed) {
      return;
    }

    if (outgoing.headersSent) {
      outgoing.destroy();
      return;
    }

    outgoing.writeHead(500, {
      "Content-Type": "application/json; charset=utf-8"
    });

    outgoing.end(
      JSON.stringify({
        error: "Internal Server Error"
      })
    );
  }

  public getAddress(): ReturnType<NodeHttpServer["address"]> {
    return this.server?.address() ?? null;
  }

  public stop(): Promise<void> {
    const server = this.server;

    if (!server) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      server.close((error?: Error) => {
        if (error) {
          reject(error);
          return;
        }

        if (this.server === server) {
          this.server = null;
        }

        resolve();
      });
    });
  }

  private sendError(
    outgoing: ServerResponse,
    statusCode: number,
    message: string
  ): void {
    if (outgoing.writableEnded || outgoing.destroyed) {
      return;
    }

    if (outgoing.headersSent) {
      outgoing.destroy();
      return;
    }

    outgoing.writeHead(statusCode, {
      "Content-Type": "application/json; charset=utf-8"
    });

    outgoing.end(
      JSON.stringify({
        error: message
      })
    );
  }

  private handleError(
    outgoing: ServerResponse,
    error: unknown
  ): void {
    if (error instanceof HttpError) {
      this.sendError(
        outgoing,
        error.statusCode,
        error.message
      );

      return;
    }


    this.sendError(
      outgoing,
      500,
      "Internal Server Error"
    );
  }
}