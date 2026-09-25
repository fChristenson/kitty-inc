import sharp from "sharp";
import path from "node:path";
import { addDropShadow } from "../../lib/synthetic-drop-shadow.mjs";
import { keepLargestOpaqueComponent } from "../../lib/keep-largest-component.mjs";

// raw src/assets/sleepyMoon.jfif (a flat vector-style sleeping crescent moon
// wearing a striped nightcap + pom-pom, blush cheek) sits on a solid FLAT
// MEDIUM-GRAY background (~201-220 brightness, channel spread <=19) —
// notably NOT white, and the cap's own light-blue ribbed fabric sometimes
// dips into that same brightness/neutrality range at its own soft highlight
// seams. Same border-flood-fill + neutrality template as
// process-icecube.mjs/process-summer.mjs: only a pixel BOTH bright enough
// (>FLOOD_LO) AND near-neutral enough (spread<=SAT_MAX) is ever admitted into
// the flood fill, and the moon/cap's own single continuous dark-navy outline
// blocks the fill from ever crossing into the cap/pompom/face interior
// regardless of any individual pixel's own value coincidentally overlapping
// the background's range. One connected shape (outline links moon+cap+
// pompom together) -> keepLargestOpaqueComponent. No baked-in shadow in the
// source -> synthesized one. Writes to src/assets/sleepyMoon.png; never
// overwrites the raw source. Backs the "Night Shift" crit's flash icon.
const WHITE_LO = 195;
const WHITE_HI = 225;
const FLOOD_LO = 195;
const SAT_MAX = 20;

const assets = path.resolve(import.meta.dirname, "../../..", "src", "assets", "crits", "seasons");
const src = path.join(assets, "sleepyMoon.jfif");
const dest = path.join(assets, "sleepyMoon.png");

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
while (qHead < qTail) {
  const idx = queue[qHead++];
  const x = idx % width;
  const y = (idx / width) | 0;
  if (x > 0) tryEnqueue(x - 1, y);
  if (x < width - 1) tryEnqueue(x + 1, y);
  if (y > 0) tryEnqueue(x, y - 1);
  if (y < height - 1) tryEnqueue(x, y + 1);
}

// only apply the soft whiteness blend at a true edge (a background pixel
// touching real content) — a background pixel with zero non-background
// neighbors (deep interior of the flood-filled region) goes straight to
// fully transparent regardless of its own local whiteness dip
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

keepLargestOpaqueComponent(data, width, height, channels);

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
