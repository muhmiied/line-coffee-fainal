import { defineConfig } from "vitest/config";
import path from "node:path";

// Smallest maintainable unit-test setup for this project: Vitest (Vite-native,
// no Jest/Babel config duplication), mirroring the `@/*` -> `src/*` alias
// tsconfig.json already declares so test imports match app imports exactly.
// No jsdom/browser environment is configured because Phase 5's test scope is
// pure logic (pricing, ownership resolution, RPC-response validation, payload
// guards) — none of it touches the DOM. Add `environment: "jsdom"` per-file
// via a docblock if a future test needs it, instead of paying its cost globally.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    environment: "node",
    globals: false,
    // Matches the placeholder, non-secret values already used in
    // .github/workflows/ci.yml — satisfies src/lib/supabase/client.ts's
    // import-time guard for any test that doesn't explicitly mock the module.
    // Never a real project; no network call is ever made from these values.
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "https://placeholder.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "placeholder-publishable-key",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.ts", "src/**/*.tsx"],
      exclude: ["src/**/*.test.ts", "src/**/*.test.tsx", "src/app/**"],
    },
  },
});
