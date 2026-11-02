
import { describe, expect, it } from "vitest";

import { Router } from "../packages/router/src/Router.js";
import type {
  RouteMiddleware,
  RouteHandler
} from "../packages/router/src/index.js";

describe("Router", () => {
  it("should register GET routes", () => {
    const router = new Router();

    router.get("/users", () => { });

    expect(router.getRoutes()).toHaveLength(1);
    expect(router.getRoutes()[0]?.method).toBe("GET");
  });

  it("should register POST routes", () => {
    const router = new Router();

    router.post("/users", () => { });

    expect(router.getRoutes()[0]?.method).toBe("POST");
  });

  it("should register PUT routes", () => {
    const router = new Router();

    router.put("/users/{id}", () => { });

    expect(router.getRoutes()[0]?.method).toBe("PUT");
  });

  it("should register PATCH routes", () => {
    const router = new Router();

    router.patch("/users/{id}", () => { });

    expect(router.getRoutes()[0]?.method).toBe("PATCH");
  });

  it("should register DELETE routes", () => {
    const router = new Router();

    router.delete("/users/{id}", () => { });

    expect(router.getRoutes()[0]?.method).toBe("DELETE");
  });

  it("should register OPTIONS routes", () => {
    const router = new Router();

    router.options("/users", () => { });

    expect(router.getRoutes()[0]?.method).toBe("OPTIONS");
  });

  it("should register HEAD routes", () => {
    const router = new Router();

    router.head("/users", () => { });

    expect(router.getRoutes()[0]?.method).toBe("HEAD");
  });

  it("should support method chaining", () => {
    const router = new Router();

    router
      .get("/users", () => { })
      .post("/users", () => { })
      .put("/users/{id}", () => { })
      .patch("/users/{id}", () => { })
      .delete("/users/{id}", () => { })
      .options("/users", () => { })
      .head("/users", () => { });

    expect(router.getRoutes()).toHaveLength(7);
  });

  it("should match a registered route", () => {
    const router = new Router();

    router.get("/users/{id}", () => { });

    const result = router.match("GET", "/users/25");

    expect(result?.params).toEqual({
      id: "25"
    });
  });

  it("should support named routes", () => {
    const router = new Router();

    router.get("/users/{id}", () => { }, "users.show");

    expect(router.getRoutes()[0]?.name).toBe("users.show");
  });

  it.each([
    ["users", "missing leading slash"],
    ["/users/", "trailing slash"],
    ["/users//posts", "empty path segment"],
    ["/users/{id", "unclosed parameter"],
    ["/users/id}", "unopened parameter"],
    ["/users/{user-id}", "invalid parameter name"],
    ["/users/{id}/{id}", "duplicate parameter"],
    ["/users?active=true", "query string"],
    ["/users#profile", "hash fragment"],
    ["/users\\admin", "backslash"]
  ])("should reject invalid route path: %s (%s)", (path) => {
    const testRouter = new Router();

    expect(() => {
      testRouter.get(path, () => { });
    }).toThrow();
  });

  it.each([
    "/",
    "/users",
    "/users/{id}",
    "/users/{userId}/posts/{postId}"
  ])("should accept valid route path: %s", (path) => {
    const testRouter = new Router();

    expect(() => {
      testRouter.get(path, () => { });
    }).not.toThrow();
  });

  it("should register a named route", () => {
    const testRouter = new Router();

    testRouter.get("/users/{id}", () => { }, "users.show");

    const routes = testRouter.getRoutes();

    expect(routes).toHaveLength(1);
    expect(routes[0]?.name).toBe("users.show");
  });

  it("should reject duplicate route names", () => {
    const testRouter = new Router();

    testRouter.get("/users/{id}", () => { }, "users.show");

    expect(() => {
      testRouter.get("/posts/{id}", () => { }, "users.show");
    }).toThrow("Route name already registered: users.show");

    expect(testRouter.getRoutes()).toHaveLength(1);
  });

  it("should support multiple unique named routes", () => {
    const testRouter = new Router();

    testRouter.get("/users/{id}", () => { }, "users.show");
    testRouter.get("/posts/{id}", () => { }, "posts.show");

    expect(testRouter.getRoutes()).toHaveLength(2);
  });

  it("should retrieve a named route by name", () => {
    const testRouter = new Router();

    testRouter.get("/users/{id}", () => { }, "users.show");

    const route = testRouter.getNamedRoute("users.show");

    expect(route).toBeDefined();
    expect(route?.name).toBe("users.show");
    expect(route?.path).toBe("/users/{id}");
    expect(route?.method).toBe("GET");
  });

  it("should return undefined for an unknown route name", () => {
    const testRouter = new Router();

    const route = testRouter.getNamedRoute("unknown.route");

    expect(route).toBeUndefined();
  });

  it("should generate URL using a named route", () => {
    const testRouter = new Router();

    testRouter.get("/users/{id}", () => { }, "users.show");

    expect(
      testRouter.url("users.show", { id: 25 })
    ).toBe("/users/25");
  });

  it("should generate URL with multiple route parameters", () => {
    const testRouter = new Router();

    testRouter.get(
      "/users/{userId}/posts/{postId}",
      () => { },
      "users.posts.show"
    );

    expect(
      testRouter.url("users.posts.show", {
        userId: 10,
        postId: 50
      })
    ).toBe("/users/10/posts/50");
  });

  it("should generate URL for a static named route", () => {
    const testRouter = new Router();

    testRouter.get("/users", () => { }, "users.index");

    expect(testRouter.url("users.index")).toBe("/users");
  });

  it("should reject unknown named routes during URL generation", () => {
    const testRouter = new Router();

    expect(() => {
      testRouter.url("unknown.route");
    }).toThrow("Named route not found: unknown.route");
  });

  it.each([
    ["", "empty value"],
    ["/admin", "forward slash"],
    ["\\admin", "backslash"],
    ["admin\nuser", "newline character"],
    ["admin\u0000user", "null byte"]
  ])(
    "should reject unsafe URL parameter values: %s (%s)",
    (value) => {
      const testRouter = new Router();

      testRouter.get(
        "/users/{id}",
        () => { },
        "users.show"
      );

      expect(() => {
        testRouter.url("users.show", { id: value });
      }).toThrow();
    }
  );

  it("should reject non-finite numeric URL parameters", () => {
    const testRouter = new Router();

    testRouter.get(
      "/users/{id}",
      () => { },
      "users.show"
    );

    expect(() => {
      testRouter.url("users.show", { id: Infinity });
    }).toThrow("Invalid numeric route parameter: id");
  });

  it("should register routes with a group prefix", () => {
    const testRouter = new Router();

    testRouter.group("/api", () => {
      testRouter.get("/users", () => { });
      testRouter.get("/posts", () => { });
    });

    const routes = testRouter.getRoutes();

    expect(routes).toHaveLength(2);
    expect(routes[0]?.path).toBe("/api/users");
    expect(routes[1]?.path).toBe("/api/posts");
  });

  it("should support nested route groups", () => {
    const testRouter = new Router();

    testRouter.group("/api", () => {
      testRouter.group("/v1", () => {
        testRouter.get("/users", () => { });
      });
    });

    const routes = testRouter.getRoutes();

    expect(routes).toHaveLength(1);
    expect(routes[0]?.path).toBe("/api/v1/users");
  });

  it("should restore the group prefix after registration", () => {
    const testRouter = new Router();

    testRouter.group("/api", () => {
      testRouter.get("/users", () => { });
    });

    testRouter.get("/dashboard", () => { });

    const routes = testRouter.getRoutes();

    expect(routes[0]?.path).toBe("/api/users");
    expect(routes[1]?.path).toBe("/dashboard");
  });

  it("should support a root path inside a route group", () => {
    const testRouter = new Router();

    testRouter.group("/api", () => {
      testRouter.get("/", () => { });
    });

    expect(testRouter.getRoutes()[0]?.path).toBe("/api");
  });

  it("should restore group prefix when callback throws an error", () => {
    const testRouter = new Router();

    expect(() => {
      testRouter.group("/api", () => {
        testRouter.get("/users", () => { });

        throw new Error("Group registration failed");
      });
    }).toThrow("Group registration failed");

    testRouter.get("/dashboard", () => { });

    const routes = testRouter.getRoutes();

    expect(routes).toHaveLength(2);
    expect(routes[0]?.path).toBe("/api/users");
    expect(routes[1]?.path).toBe("/dashboard");
  });

  it.each([
    ["api", "missing leading slash"],
    ["/api/", "trailing slash"],
    ["/api//v1", "empty path segment"],
    ["/api?version=1", "query string"],
    ["/api#users", "hash fragment"],
    ["/api\\v1", "backslash"]
  ])("should reject invalid group prefix: %s (%s)", (prefix) => {
    const testRouter = new Router();

    expect(() => {
      testRouter.group(prefix, () => {
        testRouter.get("/users", () => { });
      });
    }).toThrow();

    expect(testRouter.getRoutes()).toHaveLength(0);
  });

  it("should preserve previous prefix after invalid nested group", () => {
    const testRouter = new Router();

    testRouter.group("/api", () => {
      expect(() => {
        testRouter.group("/invalid/", () => { });
      }).toThrow();

      testRouter.get("/users", () => { });
    });

    expect(testRouter.getRoutes()[0]?.path).toBe("/api/users");
  });

  it("should register middleware for GET routes", () => {
    const testRouter = new Router();

    const middleware: RouteMiddleware = async (_context, next) => {
      await next();
    };

    const handler: RouteHandler = () => { };

    testRouter.get("/admin", handler, "admin.dashboard", [middleware]);

    const routes = testRouter.getRoutes();

    expect(routes).toHaveLength(1);
    expect(routes[0]?.middleware).toEqual([middleware]);
  });

  it("should register middleware for all other HTTP methods", () => {
    const testRouter = new Router();

    const middleware: RouteMiddleware = async (_context, next) => {
      await next();
    };

    const handler: RouteHandler = () => { };

    testRouter.post("/posts", handler, undefined, [middleware]);
    testRouter.put("/posts/{id}", handler, undefined, [middleware]);
    testRouter.patch("/posts/{id}", handler, undefined, [middleware]);
    testRouter.delete("/posts/{id}", handler, undefined, [middleware]);
    testRouter.options("/posts", handler, undefined, [middleware]);
    testRouter.head("/posts", handler, undefined, [middleware]);

    const routes = testRouter.getRoutes();

    expect(routes).toHaveLength(6);

    for (const route of routes) {
      expect(route.middleware).toEqual([middleware]);
    }
  });

  it("should execute route middleware before the route handler", async () => {
    const testRouter = new Router();
    const executionOrder: string[] = [];

    const middleware: RouteMiddleware = async (_context, next) => {
      executionOrder.push("middleware-before");

      await next();

      executionOrder.push("middleware-after");
    };

    const handler: RouteHandler = () => {
      executionOrder.push("handler");
    };

    testRouter.get("/admin", handler, undefined, [middleware]);

    const route = testRouter.getRoutes()[0];

    expect(route).toBeDefined();

    if (!route) {
      throw new Error("Route was not registered.");
    }

    await testRouter.execute(route, {
      params: {},
      query: {}
    });

    expect(executionOrder).toEqual([
      "middleware-before",
      "handler",
      "middleware-after"
    ]);
  });

  it("should stop route execution when middleware does not call next()", async () => {
    const testRouter = new Router();

    let handlerExecuted = false;

    const middleware: RouteMiddleware = () => {
      // Stop execution intentionally.
    };

    const handler: RouteHandler = () => {
      handlerExecuted = true;
    };

    testRouter.get("/admin", handler, undefined, [middleware]);

    const route = testRouter.getRoutes()[0];

    expect(route).toBeDefined();

    if (!route) {
      throw new Error("Route was not registered.");
    }

    await testRouter.execute(route, {
      params: {},
      query: {}
    });

    expect(handlerExecuted).toBe(false);
  });

  it("should propagate middleware errors during route execution", async () => {
    const testRouter = new Router();

    const middleware: RouteMiddleware = async () => {
      throw new Error("Authentication failed.");
    };

    const handler: RouteHandler = () => { };

    testRouter.get("/admin", handler, undefined, [middleware]);

    const route = testRouter.getRoutes()[0];

    expect(route).toBeDefined();

    if (!route) {
      throw new Error("Route was not registered.");
    }

    await expect(
      testRouter.execute(route, {
        params: {},
        query: {}
      })
    ).rejects.toThrow("Authentication failed.");
  });

  it("should apply group middleware to all group routes", () => {
    const testRouter = new Router();

    const middleware: RouteMiddleware = async (_context, next) => {
      await next();
    };

    const handler: RouteHandler = () => { };

    testRouter.group(
      "/admin",
      () => {
        testRouter.get("/dashboard", handler);
        testRouter.get("/users", handler);
      },
      [middleware]
    );

    const routes = testRouter.getRoutes();

    expect(routes).toHaveLength(2);
    expect(routes[0]?.middleware).toEqual([middleware]);
    expect(routes[1]?.middleware).toEqual([middleware]);
  });

  it("should combine parent and nested group middleware", () => {
    const testRouter = new Router();

    const parentMiddleware: RouteMiddleware = async (_context, next) => {
      await next();
    };

    const childMiddleware: RouteMiddleware = async (_context, next) => {
      await next();
    };

    const handler: RouteHandler = () => { };

    testRouter.group("/api", () => {
      testRouter.group(
        "/admin",
        () => {
          testRouter.get("/dashboard", handler);
        },
        [childMiddleware]
      );
    }, [parentMiddleware]);

    const routes = testRouter.getRoutes();

    expect(routes).toHaveLength(1);
    expect(routes[0]?.path).toBe("/api/admin/dashboard");

    expect(routes[0]?.middleware).toEqual([
      parentMiddleware,
      childMiddleware
    ]);
  });

  it("should execute nested group middleware in correct order", async () => {
    const testRouter = new Router();
    const executionOrder: string[] = [];

    const parentMiddleware: RouteMiddleware = async (_context, next) => {
      executionOrder.push("parent-before");
      await next();
      executionOrder.push("parent-after");
    };

    const childMiddleware: RouteMiddleware = async (_context, next) => {
      executionOrder.push("child-before");
      await next();
      executionOrder.push("child-after");
    };

    const handler: RouteHandler = () => {
      executionOrder.push("handler");
    };

    testRouter.group("/api", () => {
      testRouter.group(
        "/admin",
        () => {
          testRouter.get("/dashboard", handler);
        },
        [childMiddleware]
      );
    }, [parentMiddleware]);

    const route = testRouter.getRoutes()[0];

    if (!route) {
      throw new Error("Route was not registered.");
    }

    await testRouter.execute(route, {
      params: {},
      query: {}
    });

    expect(executionOrder).toEqual([
      "parent-before",
      "child-before",
      "handler",
      "child-after",
      "parent-after"
    ]);
  });

  it("should restore group middleware after leaving the group", () => {
    const testRouter = new Router();

    const groupMiddleware: RouteMiddleware = async (_context, next) => {
      await next();
    };

    const handler: RouteHandler = () => { };

    testRouter.group(
      "/admin",
      () => {
        testRouter.get("/dashboard", handler);
      },
      [groupMiddleware]
    );

    testRouter.get("/home", handler);

    const routes = testRouter.getRoutes();

    expect(routes).toHaveLength(2);

    expect(routes[0]?.middleware).toEqual([groupMiddleware]);

    expect(routes[1]?.path).toBe("/home");
    expect(routes[1]?.middleware).toBeUndefined();
  });

  it("should execute group middleware before route middleware", async () => {
    const testRouter = new Router();
    const executionOrder: string[] = [];

    const groupMiddleware: RouteMiddleware = async (_context, next) => {
      executionOrder.push("group-before");
      await next();
      executionOrder.push("group-after");
    };

    const routeMiddleware: RouteMiddleware = async (_context, next) => {
      executionOrder.push("route-before");
      await next();
      executionOrder.push("route-after");
    };

    const handler: RouteHandler = () => {
      executionOrder.push("handler");
    };

    testRouter.group(
      "/admin",
      () => {
        testRouter.get(
          "/dashboard",
          handler,
          undefined,
          [routeMiddleware]
        );
      },
      [groupMiddleware]
    );

    const route = testRouter.getRoutes()[0];

    if (!route) {
      throw new Error("Route was not registered.");
    }

    await testRouter.execute(route, {
      params: {},
      query: {}
    });

    expect(executionOrder).toEqual([
      "group-before",
      "route-before",
      "handler",
      "route-after",
      "group-after"
    ]);
  });

  it("should restore group middleware after callback error", () => {
    const testRouter = new Router();

    const groupMiddleware: RouteMiddleware = async (_context, next) => {
      await next();
    };

    const handler: RouteHandler = () => { };

    expect(() => {
      testRouter.group(
        "/admin",
        () => {
          throw new Error("Group callback failed.");
        },
        [groupMiddleware]
      );
    }).toThrow("Group callback failed.");

    testRouter.get("/home", handler);

    const routes = testRouter.getRoutes();

    expect(routes).toHaveLength(1);
    expect(routes[0]?.path).toBe("/home");
    expect(routes[0]?.middleware).toBeUndefined();
  });

});
