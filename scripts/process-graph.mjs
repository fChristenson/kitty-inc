import sharp from "sharp";
import path from "node:path";

// raw src/assets/graph.jfif (AI-generated: a cartoon line-graph card icon with a
// magnifying glass, on a plain off-white background) gets border-flood-fill
// chroma-keyed to transparent (same technique as process-coin.mjs/
// process-shield.mjs), then cropped to its own tight bounding box. Writes to
// src/assets/graph.png; never overwrites the raw source.

const WHITE_LO = 200;
const WHITE_HI = 244;
const FLOOD_LO = 150;
// this raw's own off-white background sits close to WHITE_HI, so ordinary
// JPEG compression noise alone produces a faint nonzero alpha across nearly
// the whole background — snap anything under this floor to fully transparent
const NOISE_ALPHA_FLOOR = 40;

const assets = path.resolve(import.meta.dirname, "..", "src", "assets");
const src = path.join(assets, "graph.jfif");
const dest = path.join(assets, "graph.png");

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
let qHead = 0,
  qTail = 0;
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
  const x = idx % width,
    y = (idx / width) | 0;
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
    let alpha =
      whiteness >= WHITE_HI
        ? 0
        : whiteness <= WHITE_LO
          ? 255
          : Math.round(
              255 * (1 - (whiteness - WHITE_LO) / (WHITE_HI - WHITE_LO)),
            );
    // this raw's own background isn't a flat white — it's JPEG-compressed
    // and sits closer to WHITE_HI, so ordinary compression noise leaves a
    // faint but nonzero alpha across nearly the whole background instead of
    // a clean 0, reading as a speckled white haze once composited over
    // anything but a plain white page. Snapping anything below this floor
    // to fully transparent removes that noise; real content edges jump from
    // 0 to a high alpha within a couple of pixels, so this never eats into
    // the icon's own visible anti-aliasing
    if (alpha < NOISE_ALPHA_FLOOR) alpha = 0;
    const i = pixelIdx * channels;
    data[i + 3] = Math.min(data[i + 3], alpha);
  }
}

// tight bounding box of the remaining opaque content, requiring a real run of
// opaque pixels per row/column (not a stray low-alpha noise speck) before counting
// it as content — same fix process-coin.mjs/process-shield.mjs needed
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
  // menu icons only ever render at ~28-34px (style.css's .worker-menu__icon) —
  // capping here avoids shipping/decoding/resampling a needlessly huge source
  .resize(160, 160, { fit: "inside", withoutEnlargement: true })
  .png()
  .toFile(dest);

const finalMeta = await sharp(dest).metadata();
console.log(
  `wrote ${path.relative(assets, dest)}: ${finalMeta.width}x${finalMeta.height}`,
);
