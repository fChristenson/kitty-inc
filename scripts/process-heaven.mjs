import sharp from "sharp";
import path from "node:path";
import { keepLargestOpaqueComponent } from "./lib/keep-largest-component.mjs";

// raw src/assets/heaven.jfif (a flat vector-style golden pearly-gate icon
// flanked by clouds, on a plain near-white background) gets chroma-keyed to
// transparent, then cropped to its own tight bounding box. Sampled pixel
// values directly first: background whiteness (min channel) sits at ~249-253,
// the cloud fills (cream/pale-blue) at ~210-231, and the gold gate/black
// outline content well below that (~0-90) — a clean gap between "background"
// and "the palest real content" here, same shape as process-chain.mjs's own
// reasoning, so a plain per-pixel whiteness threshold (no border flood fill
// needed) correctly clears the background while leaving the pale cloud fills
// fully opaque. Writes to src/assets/heaven.png; never overwrites the raw
// source.
const WHITE_LO = 235;
const WHITE_HI = 248;

const assets = path.resolve(import.meta.dirname, "..", "src", "assets");
const src = path.join(assets, "heaven.jfif");
const dest = path.join(assets, "heaven.png");

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

// the gate+clouds are one single connected scene — discard any other
// surviving opaque speck (JFIF compression noise near the former background)
keepLargestOpaqueComponent(data, width, height, channels);

// tight bounding box of the remaining opaque content, requiring a real run of
// opaque pixels per row/column (not a stray low-alpha noise speck) before
// counting it as content
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
