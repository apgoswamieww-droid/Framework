import type { RouteContext, RouteHandler } from "./RouteHandler.js";
import type { RouteMiddleware } from "./RouteMiddleware.js";

export class RouteMiddlewareRunner {
  public async run(
    context: RouteContext,
    middleware: readonly RouteMiddleware[],
    handler: RouteHandler
  ): Promise<void> {
    let lastIndex = -1;

    const dispatch = async (index: number): Promise<void> => {
      if (index <= lastIndex) {
        throw new Error("Middleware next() called multiple times.");
      }

      lastIndex = index;

      const currentMiddleware = middleware[index];

      if (!currentMiddleware) {
        await handler(context);
        return;
      }

      await currentMiddleware(context, () => dispatch(index + 1));
    };

    await dispatch(0);
  }
}