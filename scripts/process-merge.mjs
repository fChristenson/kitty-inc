import sharp from "sharp";
import path from "node:path";

// raw src/assets/merge.jfif (AI-generated: a cartoon "merge two companies" icon
// — two folders/cards joining, on a plain GRAY background, noticeably darker
// than coin.jfif/shield.jfif's own near-white background) gets border-flood-fill
// chroma-keyed to transparent, then cropped to its own tight bounding box.
// Writes to src/assets/merge.png; never overwrites the raw source.
//
// thresholds are shifted down from process-coin.mjs/process-shield.mjs's own
// (200/244/150) to match this raw's own gray (~178-185 min-channel) background
// instead of a near-white one — using the near-white thresholds here would
// leave the whole background fully opaque instead of transparent
const WHITE_LO = 150;
const WHITE_HI = 178;
const FLOOD_LO = 120;
// same fix process-graph.mjs needed: JPEG compression noise alone can leave a
// faint nonzero alpha across nearly the whole background instead of a clean 0.
// Needed higher here (40 wasn't enough) — this raw's border area left a few
// gray-on-gray specks up to alpha 82, which is still low enough to be
// background bleed (genuine content edges jump straight to a much higher
// alpha), but high enough to survive the crop's own MIN_OPAQUE_RUN check and
// get pulled into the final image as a visible border residue
const NOISE_ALPHA_FLOOR = 100;

const assets = path.resolve(import.meta.dirname, "..", "src", "assets");
const src = path.join(assets, "merge.jfif");
const dest = path.join(assets, "merge.png");

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
  .png()
  .toFile(dest);

const finalMeta = await sharp(dest).metadata();
console.log(
  `wrote ${path.relative(assets, dest)}: ${finalMeta.width}x${finalMeta.height}`,
);
