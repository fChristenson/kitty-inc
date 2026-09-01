import sharp from "sharp";
import path from "node:path";
import fs from "node:fs/promises";
import { resolveThemeDirs } from "./lib/theme-dirs.mjs";

// raw street art (e.g. street2.png, street.jfif, ...) dropped into a theme's own
// src/assets/themes/<theme>/ folder (AI-generated) is a flat, orthographic
// (no-perspective) road/sidewalk strip with one centered streetlight, on a plain
// white margin above and below. This just needs its white margins trimmed off —
// no chroma-keying, the road band itself is meant to be fully opaque. sharp's
// trim() alone leaves a few residual near-white/antialiased pixels right at the
// new top/bottom edges (the transition band between the true white margin and the
// actual road art), so a small extra inset crop strips those too. Writes to that
// theme's own dist/ground/street.png. Pass --theme=<name> to process a theme
// other than the default "references". Safe to re-run any time the raw source is
// replaced; never overwrites it.

// found by sampling the trimmed reference image: rows 0-3 (top) and the last ~2
// rows (bottom) are still a near-white/transitional gray, not real road content —
// a reasonable starting default for any new theme's own street art too, though a
// different raw image may need these hand-tuned again
const INSET_TOP = 5;
const INSET_BOTTOM = 3;

const assets = path.resolve(import.meta.dirname, "..", "src", "assets");
const { theme, themeDir, distDir } = resolveThemeDirs(assets);
const outDir = path.join(distDir, "ground");
const dest = path.join(outDir, "street.png");

const srcFile = (await fs.readdir(themeDir, { withFileTypes: true }))
  .filter((e) => e.isFile())
  .map((e) => e.name)
  .find((f) => /^street\d*\.(png|jpe?g|jfif)$/i.test(f));

if (!srcFile) {
  console.log(
    `no streetN.png/.jpg/.jfif source image found in ${path.relative(assets, themeDir)}/ — nothing to do`,
  );
} else {
  const src = path.join(themeDir, srcFile);
  await fs.mkdir(outDir, { recursive: true });
  const trimmed = await sharp(src)
    .trim({ threshold: 20 })
    .toBuffer({ resolveWithObject: true });
  const { width, height } = trimmed.info;
  await sharp(trimmed.data)
    .extract({
      left: 0,
      top: INSET_TOP,
      width,
      height: height - INSET_TOP - INSET_BOTTOM,
    })
    .png()
    .toFile(dest);
  console.log(`${srcFile} -> ${theme}/dist/ground/street.png`);
}

const finalMeta = await sharp(dest).metadata();
console.log(
  `wrote ${path.relative(assets, dest)}: ${finalMeta.width}x${finalMeta.height}`,
);
