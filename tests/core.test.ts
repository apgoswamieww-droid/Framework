
import { describe, it, expect } from "vitest";

import {
  Application,
  Config,
  Container
} from "../packages/core/src/index.js";

describe("NOVA Core", () => {

  describe("Application", () => {

    it("should create an application with default values", () => {
      const app = new Application();

      expect(app.name).toBe("NOVA Framework");
      expect(app.version).toBe("0.1.0");
      expect(app.isInitialized).toBe(false);
    });

    it("should initialize the application", () => {
      const app = new Application();

      app.initialize();

      expect(app.isInitialized).toBe(true);
    });

    it("should support custom application options", () => {
      const app = new Application({
        name: "My NOVA App",
        version: "1.0.0"
      });

      expect(app.name).toBe("My NOVA App");
      expect(app.version).toBe("1.0.0");
    });

  });

  describe("Config", () => {

    it("should retrieve configuration values", () => {
      const config = new Config({
        port: 4000,
        environment: "development"
      });

      expect(config.get("port")).toBe(4000);
      expect(config.get("environment")).toBe("development");
    });

    it("should update configuration values", () => {
      const config = new Config();

      config.set("debug", true);

      expect(config.get("debug")).toBe(true);
    });

    it("should check whether a key exists", () => {
      const config = new Config({
        port: 4000
      });

      expect(config.has("port")).toBe(true);
      expect(config.has("missing")).toBe(false);
    });

  });

  describe("Container", () => {

    it("should register and resolve a service", () => {
      const container = new Container();
      const LOGGER = Symbol("Logger");

      container.register(LOGGER, () => ({
        message: "Logger Ready"
      }));

      const logger = container.resolve<{
        message: string;
      }>(LOGGER);

      expect(logger.message).toBe("Logger Ready");
    });

    it("should return the same singleton instance", () => {
      const container = new Container();
      const LOGGER = Symbol("Logger");

      container.singleton(LOGGER, () => ({
        message: "NOVA Logger"
      }));

      const first = container.resolve(LOGGER);
      const second = container.resolve(LOGGER);

      expect(first).toBe(second);
    });

    it("should throw an error for an unregistered service", () => {
      const container = new Container();
      const UNKNOWN = Symbol("Unknown");

      expect(() => {
        container.resolve(UNKNOWN);
      }).toThrow("Service not found");
    });

  });

});
