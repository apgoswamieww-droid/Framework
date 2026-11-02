
import { describe, expect, it } from "vitest";

import { RouteRegistry } from "../packages/router/src/RouteRegistry.js";

describe("RouteRegistry", () => {
  it("should register a route", () => {
    const registry = new RouteRegistry();

    registry.add({
      method: "GET",
      path: "/users",
      handler: () => {}
    });

    expect(registry.getAll()).toHaveLength(1);
    expect(registry.getAll()[0]?.path).toBe("/users");
  });

  it("should register multiple routes", () => {
    const registry = new RouteRegistry();

    registry.add({
      method: "GET",
      path: "/users",
      handler: () => {}
    });

    registry.add({
      method: "POST",
      path: "/users",
      handler: () => {}
    });

    expect(registry.getAll()).toHaveLength(2);
  });

  it("should support method chaining", () => {
    const registry = new RouteRegistry();

    registry
      .add({
        method: "GET",
        path: "/users",
        handler: () => {}
      })
      .add({
        method: "GET",
        path: "/posts",
        handler: () => {}
      });

    expect(registry.getAll()).toHaveLength(2);
  });

  it("should clear all registered routes", () => {
    const registry = new RouteRegistry();

    registry.add({
      method: "GET",
      path: "/users",
      handler: () => {}
    });

    registry.clear();

    expect(registry.getAll()).toHaveLength(0);
  });
});
