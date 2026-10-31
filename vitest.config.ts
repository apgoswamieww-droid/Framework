
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "tests/**/*.test.ts"
    ],

    environment: "node",

    globals: false,

    clearMocks: true,
    restoreMocks: true,

    testTimeout: 5000,

    reporters: ["default"]
  }
});
