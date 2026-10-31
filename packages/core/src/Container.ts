
export type ServiceFactory<T> = (container: Container) => T;

interface ServiceBinding {
  factory: ServiceFactory<unknown>;
  singleton: boolean;
  resolved: boolean;
  instance?: unknown;
}

export class Container {
  private readonly bindings = new Map<symbol, ServiceBinding>();

  private readonly resolving = new Set<symbol>();

  public register<T>(
    token: symbol,
    factory: ServiceFactory<T>
  ): this {
    return this.addBinding(token, factory, false);
  }

  public singleton<T>(
    token: symbol,
    factory: ServiceFactory<T>
  ): this {
    return this.addBinding(token, factory, true);
  }

  private addBinding<T>(
    token: symbol,
    factory: ServiceFactory<T>,
    singleton: boolean
  ): this {
    if (this.bindings.has(token)) {
      throw new Error(
        `Service already registered: ${token.description ?? "Unknown"}`
      );
    }

    this.bindings.set(token, {
      factory,
      singleton,
      resolved: false
    });

    return this;
  }

  public resolve<T>(token: symbol): T {
    const binding = this.bindings.get(token);

    if (!binding) {
      throw new Error(
        `Service not found: ${token.description ?? "Unknown"}`
      );
    }

    if (binding.singleton && binding.resolved) {
      return binding.instance as T;
    }

    if (this.resolving.has(token)) {
      throw new Error(
        `Circular dependency detected: ${token.description ?? "Unknown"}`
      );
    }

    this.resolving.add(token);

    try {
      const instance = binding.factory(this);

      if (binding.singleton) {
        binding.instance = instance;
        binding.resolved = true;
      }

      return instance as T;
    } finally {
      this.resolving.delete(token);
    }
  }

  public has(token: symbol): boolean {
    return this.bindings.has(token);
  }
}
