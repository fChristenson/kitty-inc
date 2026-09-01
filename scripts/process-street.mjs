import sharp from "sharp";
import path from "node:path";
import fs from "node:fs/promises";

// raw src/assets/street2.png (AI-generated) is a flat, orthographic (no-perspective)
// road/sidewalk strip with one centered streetlight, on a plain white margin above
// and below. Unlike the original street.png (a full perspective scene, which never
// tiled cleanly and had a baked-in sky to work around), this just needs its white
// margins trimmed off — no chroma-keying, the road band itself is meant to be fully
// opaque. sharp's trim() alone leaves a few residual near-white/antialiased pixels
// right at the new top/bottom edges (the transition band between the true white
// margin and the actual road art), so a small extra inset crop strips those too.
// Writes to src/assets/themes/references/dist/ground/street.png. Safe to re-run any
// time src/assets/street2.png is replaced; never overwrites the raw source file.

// found by sampling the trimmed image: rows 0-3 (top) and the last ~2 rows (bottom)
// are still a near-white/transitional gray, not real road content
const INSET_TOP = 5;
const INSET_BOTTOM = 3;

const assets = path.resolve(import.meta.dirname, "..", "src", "assets");
const src = path.join(assets, "street2.png");
const outDir = path.join(assets, "themes", "references", "dist", "ground");
const dest = path.join(outDir, "street.png");

await fs.mkdir(outDir, { recursive: true });
const trimmed = await sharp(src)
  .trim({ threshold: 10 })
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

const finalMeta = await sharp(dest).metadata();
console.log(
  `wrote ${path.relative(assets, dest)}: ${finalMeta.width}x${finalMeta.height}`,
);
