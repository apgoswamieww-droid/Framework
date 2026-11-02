const PARAMETER_PATTERN = /^\{([a-zA-Z_][a-zA-Z0-9_]*)\}$/;

export function validateRoutePath(path: string): void {
  if (typeof path !== "string" || !path.startsWith("/")) {
    throw new Error("Route path must start with '/'.");
  }

  if (
    path.includes("?") ||
    path.includes("#") ||
    path.includes("\\") ||
    /[\u0000-\u001F\u007F]/.test(path)
  ) {
    throw new Error("Route path contains invalid characters.");
  }

  if (path === "/") {
    return;
  }

  const segments = path.slice(1).split("/");
  const parameterNames = new Set<string>();

  for (const segment of segments) {
    if (!segment) {
      throw new Error("Route path cannot contain empty segments.");
    }

    if (segment.includes("{") || segment.includes("}")) {
      const match = PARAMETER_PATTERN.exec(segment);

      if (!match || !match[1]) {
        throw new Error("Invalid route parameter syntax.");
      }

      const parameterName = match[1];

      if (parameterNames.has(parameterName)) {
        throw new Error(
          `Duplicate route parameter: ${parameterName}`
        );
      }

      parameterNames.add(parameterName);
    }
  }
}