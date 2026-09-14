import sharp from "sharp";
import path from "node:path";
import { addDropShadow } from "./lib/synthetic-drop-shadow.mjs";
import { keepLargestOpaqueComponent } from "./lib/keep-largest-component.mjs";

// raw src/assets/snowball.jfif (a flat vector-style snowball, dark-navy
// outline, pale icy-blue glassy faces) sits on a solid FLAT MEDIUM GRAY
// background (~224-226 brightness, channel spread ~2) — same shape as
// process-icecube.mjs's own background, and again NOT white, so a
// whiteness-only threshold would also eat the snowball's own palest
// highlight (spread ~13-20, clearly blue-tinted even at its lightest).
// Neutrality (spread) is what separates them: border-seeded flood fill only
// admits near-neutral, backgroundish-brightness pixels. The outline keeps
// every face connected into one single opaque shape, so
// keepLargestOpaqueComponent safely drops any leftover antialiasing fleck.
// The baked-in shadow matches the background's own color exactly (so it
// chroma-keys away with the rest of the background; a synthetic one is
// composited back in). Cropped to its own tight bounding box, resized,
// palette-quantized (dither:0 + the interior-noise distance-transform
// cleanup — see process-sunny.mjs's own comment for why: this same
// small-brightness-gap chroma-key can otherwise punch invisible partial-
// alpha noise holes deep inside the fill that a later addDropShadow reveals
// as gray blotches). Writes to src/assets/snowball.png; never overwrites
// the raw source. Backs the "Snowball" crit's flash icon.
const WHITE_LO = 205;
const WHITE_HI = 222;
const FLOOD_LO = 200;
// background is near-perfectly neutral; even the snowball's own palest
// highlight is clearly blue-tinted well above this gap
const SAT_MAX = 10;
// see process-sunny.mjs's own comment: protects the interior fill from
// stray JPEG-noise pixels whose whiteness dips into the WHITE_LO..WHITE_HI
// blend band purely by chance, which addDropShadow would otherwise reveal
const SAFE_INTERIOR_DIST = 6;

const assets = path.resolve(import.meta.dirname, "..", "src", "assets");
const src = path.join(assets, "snowball.jfif");
const dest = path.join(assets, "snowball.png");

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

// see process-sunny.mjs's own comment: a multi-source BFS distance-from-
// background transform tells true silhouette edges (always near a real
// alpha=0 pixel) apart from interior JPEG-noise holes (far from any true
// background pixel), regardless of the noise cluster's size
const dist = new Int16Array(width * height).fill(-1);
const bfsQueue = new Int32Array(width * height);
let bfsHead = 0;
let bfsTail = 0;
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const idx = y * width + x;
    if (data[idx * channels + 3] === 0) {
      dist[idx] = 0;
      bfsQueue[bfsTail++] = idx;
    }
  }
}
while (bfsHead < bfsTail) {
  const idx = bfsQueue[bfsHead++];
  const x = idx % width;
  const y = (idx / width) | 0;
  const d = dist[idx] + 1;
  if (d > SAFE_INTERIOR_DIST) continue;
  const neighbors = [
    x > 0 ? idx - 1 : -1,
    x < width - 1 ? idx + 1 : -1,
    y > 0 ? idx - width : -1,
    y < height - 1 ? idx + width : -1,
  ];
  for (const nIdx of neighbors) {
    if (nIdx >= 0 && dist[nIdx] === -1) {
      dist[nIdx] = d;
      bfsQueue[bfsTail++] = nIdx;
    }
  }
}
for (let idx = 0; idx < width * height; idx++) {
  if (dist[idx] === -1 && data[idx * channels + 3] < 255) {
    data[idx * channels + 3] = 255;
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
  .png({ compressionLevel: 9, palette: true, dither: 0 })
  .toFile(dest);

const finalMeta = await sharp(dest).metadata();
console.log(
  `wrote ${path.relative(assets, dest)}: ${finalMeta.width}x${finalMeta.height}`,
);
