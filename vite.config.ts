import fs from "node:fs";
import { defineConfig, type Plugin } from "vite";
import { writeCritKinds } from "./scripts/crit-kinds.mjs";

// critData/kinds.ts follows the featured crit catalog: written on start and
// whenever a critData file changes
const critKinds: Plugin = {
  name: "crit-kinds",
  config: () => void writeCritKinds(),
  configureServer(server) {
    server.watcher.on("all", (_event, file) => {
      if (/critData[\\/](?!kinds\.ts)\w+\.ts$/.test(file)) writeCritKinds();
    });
  },
};

// the game's markup lives in index.html (it parses and paints before any code
// loads); the perf rig's page gets the same markup in place of <!-- game -->
const gameMarkup: Plugin = {
  name: "game-markup",
  // before vite processes the page, so the markup's asset URLs get the base too
  transformIndexHtml: {
    order: "pre",
    handler(html, { filename }) {
      if (!html.includes("<!-- game -->")) return html;
      const index = fs.readFileSync(
        new URL("index.html", import.meta.url),
        "utf8",
      );
      const markup = /<!-- game:start[\s\S]*?<!-- game:end -->/.exec(index);
      if (!markup)
        throw new Error(`${filename}: index.html has no game markup`);
      return html.replace("<!-- game -->", markup[0]);
    },
  },
};

// served from https://fChristenson.github.io/kitty-inc/ (a GitHub Pages project
// site, not a custom domain or a <user>.github.io repo), so every asset URL must be
// prefixed with the repo name or they'd 404 once deployed.
// --mode perf builds the perf rig too, into its own folder: bundled and
// minified like the shipped game, so a cold start measures what players get
// rather than the dev server's hundreds of unbundled modules. Unminified, so
// the rig's canvas sources and profiles keep their function names
export default defineConfig(({ mode }) => ({
  base: "/kitty-inc/",
  plugins: [critKinds, gameMarkup],
  ...(mode === "perf" && {
    build: {
      outDir: "dist-perf",
      minify: false,
      rollupOptions: { input: ["index.html", "perf/index.html"] },
    },
  }),
}));
