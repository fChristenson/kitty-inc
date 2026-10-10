import { defineConfig } from "vite";

// served from https://fChristenson.github.io/kitty-inc/ (a GitHub Pages project
// site, not a custom domain or a <user>.github.io repo), so every asset URL must be
// prefixed with the repo name or they'd 404 once deployed.
// --mode perf builds the perf rig too, into its own folder: bundled and
// minified like the shipped game, so a cold start measures what players get
// rather than the dev server's hundreds of unbundled modules. Unminified, so
// the rig's canvas sources and profiles keep their function names
export default defineConfig(({ mode }) => ({
  base: "/kitty-inc/",
  ...(mode === "perf" && {
    build: {
      outDir: "dist-perf",
      minify: false,
      rollupOptions: { input: ["index.html", "perf/index.html"] },
    },
  }),
}));
