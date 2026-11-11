// @lovable.dev/vite-tanstack-config already includes tanstackStart, viteReact, tailwindcss,
// tsConfigPaths, nitro (build-only), VITE_* env injection and the @ path alias.
// Do NOT add those plugins again or the app will break with duplicate plugins.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    server: { entry: "server" },
  },
  // Build a Vercel Build Output (.vercel/output) instead of the Cloudflare default.
  nitro: { preset: "vercel" },
});
