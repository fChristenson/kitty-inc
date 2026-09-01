import sharp from "sharp";
import path from "node:path";
import fs from "node:fs/promises";
import { resolveThemeDirs } from "./lib/theme-dirs.mjs";

// some raw theme art needs no chroma-key/trim/crop at all — it's already meant to
// be a full-bleed, edge-to-edge backdrop (city skyline, wall material tile, city
// map background, ...). This just converts whichever of those raw files exist in
// a theme's own src/assets/themes/<theme>/ folder straight to PNG in that same
// theme's own dist/ root, under the standardized name loadAssets.ts's IMAGE_FILES
// map expects. Pass --theme=<name> to process a theme other than the default
// "references"; never overwrites the raw source files. Safe to re-run any time.
//
// add an entry here whenever a new flat/no-processing-needed image type is
// introduced — the raw filename prefix is matched against any of .png/.jpg/.jfif
const FLAT_IMAGES = [
  { rawPrefix: "cityBg", rawFallback: "city", destName: "city.png" },
  { rawPrefix: "wallMaterial", destName: "wallMaterial.png" },
  { rawPrefix: "mapBg", destName: "mapBg.png" },
];

const assets = path.resolve(import.meta.dirname, "..", "src", "assets");
const { theme, themeDir, distDir } = resolveThemeDirs(assets);
const rawFiles = (await fs.readdir(themeDir, { withFileTypes: true }))
  .filter((e) => e.isFile())
  .map((e) => e.name);

function findRaw(prefix) {
  return rawFiles.find((f) =>
    new RegExp(`^${prefix}\\.(png|jpe?g|jfif)$`, "i").test(f),
  );
}

let processed = 0;
await fs.mkdir(distDir, { recursive: true });
for (const { rawPrefix, rawFallback, destName } of FLAT_IMAGES) {
  const srcFile = findRaw(rawPrefix) ?? (rawFallback && findRaw(rawFallback));
  if (!srcFile) continue;
  await sharp(path.join(themeDir, srcFile))
    .png()
    .toFile(path.join(distDir, destName));
  console.log(`${srcFile} -> ${theme}/dist/${destName}`);
  processed++;
}
if (processed === 0) {
  console.log(
    `no flat image sources (${FLAT_IMAGES.map((f) => f.rawPrefix).join(", ")}) found in ${path.relative(assets, themeDir)}/ — nothing to do`,
  );
}
