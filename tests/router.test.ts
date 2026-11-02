
import { describe, expect, it } from "vitest";

import { Router } from "../packages/router/src/Router.js";

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

});
