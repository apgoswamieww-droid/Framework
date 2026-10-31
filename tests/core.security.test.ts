
import { describe, it, expect } from "vitest";

import {
  Config,
  Container
} from "../packages/core/src/index.js";

describe("NOVA Core Security Tests", () => {

  describe("Config Security", () => {

    it("should safely store prototype-related keys", () => {
      const config = new Config();

      config.set("__proto__", "safe-value");
      config.set("constructor", "safe-constructor");
      config.set("prototype", "safe-prototype");

      expect(config.get("__proto__")).toBe("safe-value");
      expect(config.get("constructor")).toBe("safe-constructor");
      expect(config.get("prototype")).toBe("safe-prototype");
    });

    it("should not modify Object prototype when exporting config", () => {
      const config = new Config();

      config.set("__proto__", {
        isAdmin: true
      });

      const snapshot = config.all();

      expect(
        Object.getPrototypeOf(snapshot)
      ).toBe(Object.prototype);

      expect(
        Object.hasOwn(snapshot, "__proto__")
      ).toBe(true);

      expect(
        Object.prototype.hasOwnProperty.call(
          Object.prototype,
          "isAdmin"
        )
      ).toBe(false);
    });

  });

  describe("Container Security", () => {

    it("should prevent duplicate service registration", () => {
      const container = new Container();
      const SERVICE = Symbol("Service");

      container.register(SERVICE, () => "first");

      expect(() => {
        container.register(SERVICE, () => "second");
      }).toThrow("Service already registered");
    });

    it("should detect circular dependencies", () => {
      const container = new Container();

      const SERVICE_A = Symbol("ServiceA");
      const SERVICE_B = Symbol("ServiceB");

      container.register(
        SERVICE_A,
        (c) => c.resolve(SERVICE_B)
      );

      container.register(
        SERVICE_B,
        (c) => c.resolve(SERVICE_A)
      );

      expect(() => {
        container.resolve(SERVICE_A);
      }).toThrow("Circular dependency detected");
    });

    it("should create new instances for transient services", () => {
      const container = new Container();
      const SERVICE = Symbol("TransientService");

      container.register(SERVICE, () => ({
        id: Math.random()
      }));

      const first = container.resolve(SERVICE);
      const second = container.resolve(SERVICE);

      expect(first).not.toBe(second);
    });

    it("should allow retry after factory failure", () => {
      const container = new Container();
      const SERVICE = Symbol("RetryService");

      let attempts = 0;

      container.singleton(SERVICE, () => {
        attempts++;

        if (attempts === 1) {
          throw new Error("Factory failed");
        }

        return {
          status: "ready"
        };
      });

      expect(() => {
        container.resolve(SERVICE);
      }).toThrow("Factory failed");

      const result = container.resolve<{
        status: string;
      }>(SERVICE);

      expect(result.status).toBe("ready");
      expect(attempts).toBe(2);
    });

  });

});
