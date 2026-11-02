
import type { HttpMethod } from "./HttpMethod.js";
import type { RouteHandler } from "./RouteHandler.js";
import type { RouteMiddleware } from "./RouteMiddleware.js";
import type { RouteParameterConstraint } from "./RouteParameterConstraint.js";

export interface RouteDefinition {
  method: HttpMethod;
  path: string;
  handler: RouteHandler;
  name?: string;
  middleware?: readonly RouteMiddleware[];
  constraints?: Readonly<
    Record<string, RouteParameterConstraint>
  >;
}


