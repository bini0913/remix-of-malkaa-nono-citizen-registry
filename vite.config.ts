// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// On Vercel (VERCEL=1 / VERCEL_ENV is set during their build) we pin the Vercel
// build output target. Everywhere else the default target is used, so the Lovable
// preview is unaffected.
// NOTE: inside the Lovable sandbox the preset is forced to cloudflare-module for
// the local preview, so `bun run build` here emits to `dist/`. On real Vercel the
// `vercel` preset is honored and output goes to `.vercel/output`.
const isVercel = !!(process.env["VERCEL"] || process.env["VERCEL_ENV"]);

export default defineConfig({
  ...(isVercel
    ? {
        nitro: {
          preset: "vercel",
          output: { dir: ".vercel/output" },
        },
      }
    : {}),
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
