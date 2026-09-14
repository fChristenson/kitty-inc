import sharp from "sharp";
import path from "node:path";
import { addDropShadow } from "./lib/synthetic-drop-shadow.mjs";
import { dropSmallOpaqueComponents } from "./lib/drop-small-components.mjs";

// raw src/assets/fastforward.jfif (a flat vector-style double-chevron "fast
// forward" glyph with three orange motion-dash lines, all disconnected from
// each other) sits over a baked-in light/mid-gray CHECKERBOARD (simulating
// transparency in the source export) rather than a solid color — both
// checker tones (~226 and ~250 brightness) are near-perfectly neutral
// (channel spread <=9), while every real content pixel (blues, orange,
// dark-navy outline) is strongly tinted, so a neutrality+brightness
// border-flood-fill (same template as process-summer.mjs) chroma-keys it
// cleanly regardless of which checker square a given pixel lands on. Uses
// dropSmallOpaqueComponents (not keepLargestOpaqueComponent) since the three
// orange dash lines are their own small components, disconnected from the
// chevrons. Cropped to its own tight bounding box, given a synthesized drop
// shadow (the source's own baked shadow is neutral gray too and gets
// chroma-keyed away with the rest of the checker background), and
// palette-quantized. Writes to src/assets/fastforward.png; never overwrites
// the raw source. Backs the "Fast Forward" crit's flash icon.
const WHITE_LO = 205;
const WHITE_HI = 240;
const FLOOD_LO = 200;
// checker background (both tones) and the baked-in shadow are all
// near-neutral; real content (saturated blues/orange, dark navy outline) is
// not, even where it happens to be bright
const SAT_MAX = 20;
const MIN_KEEP_AREA = 200;

const assets = path.resolve(import.meta.dirname, "..", "src", "assets");
const src = path.join(assets, "fastforward.jfif");
const dest = path.join(assets, "fastforward.png");

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

// a confirmed-background pixel only needs the soft whiteness blend right at
// its true edge against real content — deep inside an enclosed pocket
// (never touching a non-background neighbor), ambient-occlusion shading can
// dip its own whiteness into the blend range and leave it wrongly near-opaque
// even though the flood fill already proved it's background; force those
// straight to fully transparent instead
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
