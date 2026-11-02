
import type { RouteDefinition } from "./RouteDefinition.js";

export interface RouteMatch {
    route: RouteDefinition;
    params: Record<string, string>;
}

export class RouteMatcher {
    public match(
        routes: readonly RouteDefinition[],
        method: string,
        pathname: string
    ): RouteMatch | undefined {
        const requestSegments = pathname.split("/");

        for (const route of routes) {
            if (route.method !== method) {
                continue;
            }

            const routeSegments = route.path.split("/");

            if (routeSegments.length !== requestSegments.length) {
                continue;
            }

            const params: Record<string, string> = {};
            let matched = true;

            for (let index = 0; index < routeSegments.length; index++) {
                const routeSegment = routeSegments[index];
                const requestSegment = requestSegments[index];

                if (
                    routeSegment === undefined ||
                    requestSegment === undefined
                ) {
                    matched = false;
                    break;
                }

                const parameterMatch = /^\{([a-zA-Z_][a-zA-Z0-9_]*)\}$/.exec(
                    routeSegment
                );

                if (parameterMatch) {
                    const parameterName = parameterMatch[1];

                    if (!parameterName || requestSegment.length === 0) {
                        matched = false;
                        break;
                    }

                    try {
                        const decodedValue = decodeURIComponent(requestSegment);

                        // Reject encoded path separators and control characters.
                        if (
                            decodedValue.includes("/") ||
                            decodedValue.includes("\\") ||
                            /[\u0000-\u001F\u007F]/.test(decodedValue)
                        ) {
                            matched = false;
                            break;
                        }

                        Object.defineProperty(params, parameterName, {
                            value: decodedValue,
                            enumerable: true,
                            configurable: true,
                            writable: true
                        });
                    } catch {
                        matched = false;
                        break;
                    }

                    continue;
                }

                if (routeSegment !== requestSegment) {
                    matched = false;
                    break;
                }
            }

            if (matched) {
                return { route, params };
            }
        }

        return undefined;
    }
}
