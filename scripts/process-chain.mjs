import sharp from "sharp";
import path from "node:path";

// raw src/assets/chain.jfif (AI-generated: a metal chain-link icon on a plain
// near-white background) gets chroma-keyed to transparent, then cropped to
// its own tight bounding box. Writes to src/assets/chain.png; never
// overwrites the raw source.
//
// Unlike process-shield.mjs/process-clock.mjs's BORDER-flood-fill (which only
// clears background pixels reachable from the image edge), this icon has
// several fully-ENCLOSED near-white regions too (the open hexagonal "holes"
// inside each linked loop, never touching the image border) — a border-only
// flood fill left those opaque. Since content (the dark chain metal, up to
// ~146 whiteness) and background (~218-240 whiteness, border AND holes alike)
// have a clean gap between them here, a plain per-pixel whiteness threshold
// (no flood-fill/connectivity at all) correctly clears both at once.
const WHITE_LO = 180;
const WHITE_HI = 215;

const assets = path.resolve(import.meta.dirname, "..", "src", "assets");
const src = path.join(assets, "chain.jfif");
const dest = path.join(assets, "chain.png");

const { data, info } = await sharp(src)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;

for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const i = (y * width + x) * channels;
    const whiteness = Math.min(data[i], data[i + 1], data[i + 2]);
    const alpha =
      whiteness >= WHITE_HI
        ? 0
        : whiteness <= WHITE_LO
          ? 255
          : Math.round(
              255 * (1 - (whiteness - WHITE_LO) / (WHITE_HI - WHITE_LO)),
            );
    data[i + 3] = Math.min(data[i + 3], alpha);
  }
}

// tight bounding box of the remaining opaque content, requiring a real run of
// opaque pixels per row/column (not a stray low-alpha noise speck) before
// counting it as content — same fix process-shield.mjs/process-clock.mjs needed
const ALPHA_CUTOFF = 20;
const MIN_OPAQUE_RUN = 20;

function firstOpaqueRow(rows, cols, get) {
  for (let a = 0; a < rows; a++) {
    let run = 0;
    for (let b = 0; b < cols; b++) {
      if (get(a, b) > ALPHA_CUTOFF) {
        run++;
        if (run >= MIN_OPAQUE_RUN) return a;
      } else {
        run = 0;
      }
    }
  }
  return rows;
}

const alphaAt = (y, x) => data[(y * width + x) * channels + 3];
const minY = firstOpaqueRow(height, width, (y, x) => alphaAt(y, x));
const maxY =
  height -
  1 -
  firstOpaqueRow(height, width, (y, x) => alphaAt(height - 1 - y, x));
const minX = firstOpaqueRow(width, height, (x, y) => alphaAt(y, x));
const maxX =
  width -
  1 -
  firstOpaqueRow(width, height, (x, y) => alphaAt(y, width - 1 - x));

await sharp(data, { raw: { width, height, channels } })
  .extract({
    left: minX,
    top: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  })
  // only ever drawn as a small flash-text backdrop — small cap + palette
  // quantization keeps this in line with the other special-crit icons
  .resize(250, 250, { fit: "inside", withoutEnlargement: true })
  .png({ compressionLevel: 9, palette: true })
  .toFile(dest);

const finalMeta = await sharp(dest).metadata();
console.log(
  `wrote ${path.relative(assets, dest)}: ${finalMeta.width}x${finalMeta.height}`,
);
