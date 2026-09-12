import sharp from "sharp";
import path from "node:path";
import { keepLargestOpaqueComponent } from "./lib/keep-largest-component.mjs";

// raw src/assets/ball.jfif (AI-generated: a striped beach ball with a soft
// drop shadow on a plain cream background) gets border-flood-fill
// chroma-keyed to transparent (same technique as process-upgrade.mjs/
// process-shield.mjs/process-clock.mjs) — the ball's white stripe panel sits
// at a similarly-high whiteness as the real background, but it's fully
// enclosed by the ball's own continuous black outline, so a border-only
// flood fill can never leak in and clear it by mistake), then cropped to its
// own tight bounding box. Ships as a plain flat cutout — the original art's
// own drop shadow is deliberately cleared along with the background, not
// preserved or resynthesized. Then palette-quantized (same as the other
// special-crit icons) to keep the shipped file small. Writes to
// src/assets/ball.png; never overwrites the raw source.
const WHITE_LO = 140;
const WHITE_HI = 180;
const FLOOD_LO = 140;

const assets = path.resolve(import.meta.dirname, "..", "src", "assets");
const src = path.join(assets, "ball.jfif");
const dest = path.join(assets, "ball.png");

const { data, info } = await sharp(src)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;

function whitenessAt(x, y) {
  const i = (y * width + x) * channels;
  return Math.min(data[i], data[i + 1], data[i + 2]);
}

const isBackground = new Uint8Array(width * height);
const queue = new Int32Array(width * height);
let qHead = 0;
let qTail = 0;
function tryEnqueue(x, y) {
  const idx = y * width + x;
  if (isBackground[idx]) return;
  if (whitenessAt(x, y) <= FLOOD_LO) return;
  isBackground[idx] = 1;
  queue[qTail++] = idx;
}
for (let x = 0; x < width; x++) {
  tryEnqueue(x, 0);
  tryEnqueue(x, height - 1);
}
for (let y = 0; y < height; y++) {
  tryEnqueue(0, y);
  tryEnqueue(width - 1, y);
}
while (qHead < qTail) {
  const idx = queue[qHead++];
  const x = idx % width;
  const y = (idx / width) | 0;
  if (x > 0) tryEnqueue(x - 1, y);
  if (x < width - 1) tryEnqueue(x + 1, y);
  if (y > 0) tryEnqueue(x, y - 1);
  if (y < height - 1) tryEnqueue(x, y + 1);
}

for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const pixelIdx = y * width + x;
    if (!isBackground[pixelIdx]) continue;
    const whiteness = whitenessAt(x, y);
    const alpha =
      whiteness >= WHITE_HI
        ? 0
        : whiteness <= WHITE_LO
          ? 255
          : Math.round(
              255 * (1 - (whiteness - WHITE_LO) / (WHITE_HI - WHITE_LO)),
            );
    const i = pixelIdx * channels;
    data[i + 3] = Math.min(data[i + 3], alpha);
  }
}

// the original art's own soft drop shadow sits at a whiteness only slightly
// below the real background, so a couple of its more distinct pixels can
// survive the fade above as a faint, disconnected ghost — the ball's real
// content (fill + black outline) is always one single connected blob, so
// discarding every other, smaller blob cleans this up completely
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

const croppedW = maxX - minX + 1;
const croppedH = maxY - minY + 1;

await sharp(data, { raw: { width, height, channels } })
  .extract({ left: minX, top: minY, width: croppedW, height: croppedH })
  // only ever drawn as a small flash-text backdrop — small cap + palette
  // quantization keeps this in line with the other special-crit icons
  .resize(250, 250, { fit: "inside", withoutEnlargement: true })
  .png({ compressionLevel: 9, palette: true })
  .toFile(dest);

const finalMeta = await sharp(dest).metadata();
console.log(
  `wrote ${path.relative(assets, dest)}: ${finalMeta.width}x${finalMeta.height}`,
);
