
import type { HttpMethod } from "./HttpMethod.js";
import type { RouteHandler } from "./RouteHandler.js";

export interface RouteDefinition {
  method: HttpMethod;
  path: string;
  handler: RouteHandler;
  name?: string;
}


