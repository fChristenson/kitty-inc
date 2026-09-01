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

// gameCanvas.ts tiles this whole image at GROUND_TILE_W (wider than one building's
// own SLOT_W), so only the image's own LEFT ~58% is ever actually visible in the
// floor view — the rest is there purely so the tile keeps repeating. If a theme's
// raw street art happened to place its "interesting" content (car, streetlight)
// further right than that, it never shows up on screen. Rolled cyclically (wraps
// the pixels that fall off one edge onto the other) rather than cropped, so the
// tile still repeats seamlessly — just starting from a different point in the
// same art. 0 (the default) leaves an image untouched. Measured for
// corporate-tech-hq by locating its car's bounding box (native x 759-1080 out of
// 1248) and rolling it left so the car lands centered in the visible ~719px band.
const THEME_ROLL_PX = {
  "corporate-tech-hq": 560,
};

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
  const inset = await sharp(trimmed.data)
    .extract({
      left: 0,
      top: INSET_TOP,
      width,
      height: height - INSET_TOP - INSET_BOTTOM,
    })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const rollPx = THEME_ROLL_PX[theme] ?? 0;
  if (rollPx > 0) {
    const { width: w, height: h } = inset.info;
    const left = sharp(inset.data, {
      raw: { width: w, height: h, channels: inset.info.channels },
    }).extract({ left: 0, top: 0, width: rollPx, height: h });
    const right = sharp(inset.data, {
      raw: { width: w, height: h, channels: inset.info.channels },
    }).extract({ left: rollPx, top: 0, width: w - rollPx, height: h });
    await sharp({
      create: {
        width: w,
        height: h,
        channels: inset.info.channels,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([
        { input: await right.png().toBuffer(), left: 0, top: 0 },
        { input: await left.png().toBuffer(), left: w - rollPx, top: 0 },
      ])
      .png()
      .toFile(dest);
  } else {
    await sharp(inset.data, {
      raw: { width, height: inset.info.height, channels: inset.info.channels },
    })
      .png()
      .toFile(dest);
  }
  console.log(`${srcFile} -> ${theme}/dist/ground/street.png`);
}

const finalMeta = await sharp(dest).metadata();
console.log(
  `wrote ${path.relative(assets, dest)}: ${finalMeta.width}x${finalMeta.height}`,
);
