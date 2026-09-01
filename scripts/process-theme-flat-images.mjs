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
  {
    rawPrefix: "cityBg",
    rawFallback: "city",
    destName: "city.png",
    cropFillerBase: true,
  },
  { rawPrefix: "wallMaterial", destName: "wallMaterial.png" },
  { rawPrefix: "mapBg", destName: "mapBg.png" },
];

// city skyline art (every theme sampled so far) bakes in a flat, solid-color
// "ground" filler strip below the buildings' own silhouettes — meant to fill out
// the canvas, but it never matches this game's own street/ground art, so it reads
// as a mismatched gap floating between the skyline and the real street once drawn
// in-game (drawCity's groundY assumes the image's bottom edge IS the buildings'
// actual base line). Detected generically instead of hardcoded per theme: scan
// rows bottom-up computing each row's luminance range (max-min of
// 0.3R+0.59G+0.11B); a flat filler row has near-zero range even after JPEG/.jfif
// compression noise, while a row through real building silhouette detail
// (windows, roofline edges) has a large range. The first row (from the bottom)
// whose range exceeds FLAT_RANGE_THRESHOLD is the true bottom edge to crop to.
const FLAT_RANGE_THRESHOLD = 30;

async function cropFillerBaseIfPresent(buffer) {
  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  let contentStartY = null;
  for (let y = height - 1; y >= 0; y--) {
    let min = 255;
    let max = 0;
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      const lum = 0.3 * data[i] + 0.59 * data[i + 1] + 0.11 * data[i + 2];
      if (lum < min) min = lum;
      if (lum > max) max = lum;
    }
    if (max - min > FLAT_RANGE_THRESHOLD) {
      contentStartY = y;
      break;
    }
  }
  // no flat band found (whole image is already real content, or entirely flat) —
  // leave it untouched rather than guessing
  if (contentStartY === null || contentStartY >= height - 1) return buffer;
  return sharp(buffer)
    .extract({ left: 0, top: 0, width, height: contentStartY + 1 })
    .png()
    .toBuffer();
}

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
for (const {
  rawPrefix,
  rawFallback,
  destName,
  cropFillerBase,
} of FLAT_IMAGES) {
  const srcFile = findRaw(rawPrefix) ?? (rawFallback && findRaw(rawFallback));
  if (!srcFile) continue;
  let out = await sharp(path.join(themeDir, srcFile)).png().toBuffer();
  if (cropFillerBase) out = await cropFillerBaseIfPresent(out);
  await sharp(out).toFile(path.join(distDir, destName));
  console.log(`${srcFile} -> ${theme}/dist/${destName}`);
  processed++;
}
if (processed === 0) {
  console.log(
    `no flat image sources (${FLAT_IMAGES.map((f) => f.rawPrefix).join(", ")}) found in ${path.relative(assets, themeDir)}/ — nothing to do`,
  );
}
