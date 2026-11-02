import type { RouteContext } from "./RouteHandler.js";

export type RouteNext = () => void | Promise<void>;

export type RouteMiddleware = (
  context: RouteContext,
  next: RouteNext
) => void | Promise<void>;