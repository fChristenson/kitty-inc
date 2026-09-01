import path from "node:path";

// resolves the --theme=<name> CLI flag (default "references") into the raw-source
// dir (a theme's own src/assets/themes/<name>/ folder, where raw AI uploads live)
// and its dist dir (src/assets/themes/<name>/dist/, the ready-to-use output every
// loadAssets.ts lookup actually reads from). Every process-*.mjs script that can
// run against more than just the original "references" theme should resolve its
// paths through this instead of hardcoding "themes/references" — that's what lets
// `node scripts/process-X.mjs --theme=corporate-tech-hq` process a new theme's own
// raw uploads the exact same way.
export function resolveThemeDirs(assetsDir) {
  const flag = process.argv.find((a) => a.startsWith("--theme="));
  const theme = flag ? flag.slice("--theme=".length) : "references";
  const themeDir = path.join(assetsDir, "themes", theme);
  const distDir = path.join(themeDir, "dist");
  return { theme, themeDir, distDir };
}
