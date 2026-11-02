import { RouteMatcher } from "../packages/router/src/RouteMatcher.ts";
import { Router } from "../packages/router/src/Router.ts";
import type { RouteDefinition } from "../packages/router/src/RouteDefinition.ts";

/**
 * Benchmark: Route Matching Optimization
 *
 * Compares the optimized RouteMatcher (cached templates, pre-split segments,
 * stable priority sort) against a faithful reimplementation of the legacy
 * algorithm (split every route path on every request, iterate in
 * registration order) using the SAME route dataset and environment.
 *
 * Run:  node --experimental-strip-types bench/route-matching.bench.ts
 */

// ---------------------------------------------------------------------------
// Realistic route dataset
// ---------------------------------------------------------------------------

function buildRoutes(count: number): RouteDefinition[] {
    const routes: RouteDefinition[] = [];

    // Static routes interspersed with dynamic ones, mirroring a real app.
    for (let index = 0; index < count; index++) {
        const isStatic = index % 3 === 0;
        const path = isStatic
            ? `/api/v${index % 5}/resources/${index}`
            : `/api/v${index % 5}/resources/{resourceId}/items/{itemId}`;
        routes.push({
            method: index % 2 === 0 ? "GET" : "POST",
            path,
            handler: () => {}
        });
    }

    return routes;
}

// ---------------------------------------------------------------------------
// Legacy matcher (pre-optimization baseline)
// ---------------------------------------------------------------------------

const PARAMETER_PATTERN = /^\{([a-zA-Z_][a-zA-Z0-9_]*)\}$/;

function legacyMatch(
    routes: readonly RouteDefinition[],
    method: string,
    pathname: string
): RouteDefinition | undefined {
    const requestSegments = pathname.split("/");

    for (const route of routes) {
        if (route.method !== method) {
            continue;
        }

        const routeSegments = route.path.split("/");

        if (routeSegments.length !== requestSegments.length) {
            continue;
        }

        let matched = true;

        for (let index = 0; index < routeSegments.length; index++) {
            const routeSegment = routeSegments[index];
            const requestSegment = requestSegments[index];

            if (routeSegment === undefined || requestSegment === undefined) {
                matched = false;
                break;
            }

            const parameterMatch = PARAMETER_PATTERN.exec(routeSegment);

            if (parameterMatch) {
                const parameterName = parameterMatch[1];

                if (!parameterName || requestSegment.length === 0) {
                    matched = false;
                    break;
                }

                if (requestSegment.includes("/") || requestSegment.includes("\\")) {
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
            return route;
        }
    }

    return undefined;
}

// ---------------------------------------------------------------------------
// Benchmark harness
// ---------------------------------------------------------------------------

function bench(name: string, fn: () => void, iterations: number): number {
    // Warm up (JIT + cache population).
    for (let i = 0; i < 1000; i++) {
        fn();
    }

    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
        fn();
    }
    const end = performance.now();

    const elapsed = end - start;
    const perOp = (elapsed / iterations) * 1000;
    console.log(
        `${name.padEnd(44)} ${iterations.toLocaleString()} iters in ` +
        `${elapsed.toFixed(2).padStart(8)} ms  (${perOp.toFixed(4).padStart(10)} µs/op)`
    );
    return elapsed;
}

function main() {
    const ROUTE_COUNT = 500;
    const ITERATIONS = 200_000;

    const routes = buildRoutes(ROUTE_COUNT);
    const matcher = new RouteMatcher();

    // Static hit: a static route exists in the collection.
    const staticPath = `/api/v0/resources/0`;
    // Dynamic hit: a parameterized route.
    const dynamicPath = `/api/v1/resources/42/items/7`;
    // Miss: no route matches.
    const missPath = `/api/v9/nope/missing`;

    console.log("Route Matching Benchmark");
    console.log("=".repeat(90));
    console.log(`Routes: ${ROUTE_COUNT} | Iterations: ${ITERATIONS.toLocaleString()}`);
    console.log(`Node: ${process.version} | Platform: ${process.platform}`);
    console.log("=".repeat(90));

    const scenarios: Array<[string, string]> = [
        ["static hit", staticPath],
        ["dynamic hit", dynamicPath],
        ["no match", missPath]
    ];

    console.log("\n--- Static hit ---");
    for (const [label, path] of scenarios) {
        const legacy = bench(
            `legacy  ${label}`,
            () => legacyMatch(routes, "GET", path),
            ITERATIONS
        );
        const optimized = bench(
            `optimized ${label}`,
            () => matcher.match(routes, "GET", path),
            ITERATIONS
        );
        const improvement = ((legacy - optimized) / legacy) * 100;
        console.log(
            `  improvement ${label}: ${improvement.toFixed(1)}%`.padEnd(60)
        );
    }

    // ---------------------------------------------------------------------------
    // Cache invalidation check
    // ---------------------------------------------------------------------------
    console.log("\n--- Cache invalidation ---");
    const router = new Router();
    router.get("/users/{id}", () => {}, "users.show");
    const before = router.match("GET", "/users/42");
    router.get("/users/create", () => {});
    const after = router.match("GET", "/users/create");
    console.log(
        `  match before add: ${before?.route.path ?? "undefined"} | ` +
        `match after add: ${after?.route.path ?? "undefined"}`
    );
    console.log(
        `  invalidation OK: ${after?.route.path === "/users/create" ? "PASS" : "FAIL"}`
    );

    console.log("\n" + "=".repeat(90));
    console.log("Benchmark complete.");
}

main();