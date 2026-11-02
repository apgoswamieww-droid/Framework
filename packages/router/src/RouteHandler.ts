
export interface RouteContext {
  params: Record<string, string>;
  query: Record<string, string | string[]>;
}

export type RouteHandler = (
  context: RouteContext
) => void | Promise<void>;
