
import { Config } from "./Config.js";
import { Container } from "./Container.js";

export interface ApplicationOptions {
  name?: string;
  version?: string;
  config?: Record<string, unknown>;
}

export class Application {
  public readonly name: string;
  public readonly version: string;

  public readonly config: Config;
  public readonly container: Container;

  private initialized = false;

  constructor(options: ApplicationOptions = {}) {
    this.name = options.name ?? "NOVA Framework";
    this.version = options.version ?? "0.1.0";

    this.config = new Config(options.config);
    this.container = new Container();
  }

  public initialize(): this {
    if (this.initialized) {
      return this;
    }

    this.initialized = true;

    return this;
  }

  public get isInitialized(): boolean {
    return this.initialized;
  }
}
