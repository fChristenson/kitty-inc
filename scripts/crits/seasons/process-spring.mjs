import sharp from "sharp";
import path from "node:path";
import { addDropShadow } from "../../lib/synthetic-drop-shadow.mjs";
import { dropSmallOpaqueComponents } from "../../lib/drop-small-components.mjs";

// raw src/assets/spring.jfif (AI-generated: a tied bouquet of flowers on a
// plain near-white background) gets border-flood-fill chroma-keyed to
// transparent (see process-pair.mjs's own comment for why this technique +
// dropSmallOpaqueComponents, not keepLargestOpaqueComponent, is the right
// pick — several of the bouquet's own petals/leaves are only loosely
// connected through their stems). Cropped to its own tight bounding box,
// given a synthesized drop shadow, and palette-quantized. Writes to
// src/assets/spring.png; never overwrites the raw source. Backs the
// "Spring Sale" crit's flash icon.
const WHITE_LO = 150;
const WHITE_HI = 195;
const FLOOD_LO = 150;
// background here is a near-perfectly neutral near-white (channel spread
// <=3); real content that's merely bright (white/cream petals) is still
// clearly tinted — requiring near-neutrality keeps the flood fill from ever
// crossing into warm-toned content even where it's bright enough to pass the
// whiteness check alone
const SAT_MAX = 20;
const MIN_KEEP_AREA = 200;

const assets = path.resolve(import.meta.dirname, "../../..", "src", "assets", "crits", "seasons");
const src = path.join(assets, "spring.jfif");
const dest = path.join(assets, "spring.png");

const { data, info } = await sharp(src)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;

function whitenessAt(x, y) {
  const i = (y * width + x) * channels;
  return Math.min(data[i], data[i + 1], data[i + 2]);
}

function isNeutralAt(x, y) {
  const i = (y * width + x) * channels;
  return (
    Math.max(data[i], data[i + 1], data[i + 2]) -
      Math.min(data[i], data[i + 1], data[i + 2]) <=
    SAT_MAX
  );
}

const isBackground = new Uint8Array(width * height);
const queue = new Int32Array(width * height);
let qHead = 0;
let qTail = 0;
function tryEnqueue(x, y) {
  const idx = y * width + x;
  if (isBackground[idx]) return;
  if (whitenessAt(x, y) <= FLOOD_LO) return;
  if (!isNeutralAt(x, y)) return;
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
// the background peeking through between the yellow/purple flowers' petals
// and stems is fully enclosed by them (no pixel path back to the image
// border survives), so the border-seeded flood fill alone can never reach it
// — these extra seeds (hand-picked by sampling the raw source) let it flood
// outward from inside that pocket too
for (const [sx, sy] of [
  [653, 324],
  [670, 350],
  [690, 380],
  [660, 400],
  [680, 420],
  [670, 470],
]) {
  tryEnqueue(sx, sy);
}
// the tied stem bundle just above the ribbon has several more of these
// enclosed background slivers between individual stems, each only a couple
// pixels wide and frequently broken up by crossing leaves — rather than
// hand-picking a seed per fragment, seed a dense grid across the whole
// stem-bundle region; tryEnqueue silently no-ops on every grid point that
// lands on a stem/leaf/ribbon pixel instead of a background one
for (let gy = 325; gy <= 545; gy += 4) {
  for (let gx = 550; gx <= 680; gx += 4) {
    tryEnqueue(gx, gy);
  }
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

// a confirmed-background pixel only needs the soft whiteness blend right at
// its true edge against real content — deep inside an enclosed pocket
// between petals/leaves (never touching a non-background neighbor), ambient-
// occlusion shading can dip its own whiteness into the blend range and leave
// it wrongly near-opaque even though the flood fill already proved it's
// background; force those straight to fully transparent instead
function touchesContent(x, y, idx) {
  return (
    (x > 0 && !isBackground[idx - 1]) ||
    (x < width - 1 && !isBackground[idx + 1]) ||
    (y > 0 && !isBackground[idx - width]) ||
    (y < height - 1 && !isBackground[idx + width])
  );
}

for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const pixelIdx = y * width + x;
    if (!isBackground[pixelIdx]) continue;
    const i = pixelIdx * channels;
    if (!touchesContent(x, y, pixelIdx)) {
      data[i + 3] = 0;
      continue;
    }
    const whiteness = whitenessAt(x, y);
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

dropSmallOpaqueComponents(data, width, height, channels, MIN_KEEP_AREA);

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
const cropped = await sharp(data, { raw: { width, height, channels } })
  .extract({ left: minX, top: minY, width: croppedW, height: croppedH })
  .ensureAlpha()
  .raw()
  .toBuffer();

const shadowed = await addDropShadow(cropped, croppedW, croppedH);

await sharp(shadowed.data, {
  raw: { width: shadowed.width, height: shadowed.height, channels: 4 },
})
  .resize(250, 250, { fit: "inside", withoutEnlargement: true })
  .png({ compressionLevel: 9, palette: true })
  .toFile(dest);

const finalMeta = await sharp(dest).metadata();
console.log(
  `wrote ${path.relative(assets, dest)}: ${finalMeta.width}x${finalMeta.height}`,
);
