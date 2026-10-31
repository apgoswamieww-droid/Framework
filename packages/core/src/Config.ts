
export class Config {
  private readonly values = new Map<string, unknown>();

  constructor(initial: Record<string, unknown> = {}) {
    for (const [key, value] of Object.entries(initial)) {
      this.values.set(key, value);
    }
  }

  public get<T = unknown>(key: string): T | undefined {
    return this.values.get(key) as T | undefined;
  }

  public set(key: string, value: unknown): this {
    this.values.set(key, value);

    return this;
  }

  public has(key: string): boolean {
    return this.values.has(key);
  }

  public all(): Record<string, unknown> {
    return Object.fromEntries(this.values);
  }
}
