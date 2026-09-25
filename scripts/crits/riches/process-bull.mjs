import sharp from "sharp";
import path from "node:path";
import { addDropShadow } from "../../lib/synthetic-drop-shadow.mjs";
import { keepLargestOpaqueComponent } from "../../lib/keep-largest-component.mjs";

// raw src/assets/bull.jfif (a flat vector-style cartoon bull, dark-brown
// outline, on a plain near-white background) gets chroma-keyed to
// transparent, then cropped to its own tight bounding box. Sampled pixel
// values directly first: background whiteness (min channel) sits at
// ~251-254; the eye whites are an ENCLOSED detail at that exact same
// whiteness (~247-255, indistinguishable from background by brightness
// alone) — only the dark iris ring around them (whiteness ~63-74) blocks
// connectivity, so a border-seeded flood fill (not a plain per-pixel
// threshold — that was tried first and incorrectly punched the eye whites
// out along with the real background, since it has no notion of
// connectivity) is required here, same reasoning as process-shield.mjs/
// process-clock.mjs/process-ball.mjs/process-upgrade.mjs. The cream
// horns/snout/belly patches (whiteness ~191-195) sit well below FLOOD_LO
// too, so the fill can never cross into them either. Body+head+horns+ears+
// tail are one single connected shape (all joined by the outline stroke),
// so keepLargestOpaqueComponent discards any leftover chroma-key noise.
// Also runs the same interior-noise distance-transform cleanup
// process-sunny.mjs needed (proactively, since this icon shares that exact
// same near-white-background shape). Given a synthesized drop shadow
// (matching the other special-crit icons) and palette-quantized
// (dither:0). Writes to src/assets/bull.png; never overwrites the raw
// source. Backs the "Bull Market" crit's flash icon.
const WHITE_LO = 205;
const WHITE_HI = 235;
const FLOOD_LO = 200;
// see process-sunny.mjs's own comment: protects the interior fill from
// stray JPEG-noise pixels whose whiteness dips into the WHITE_LO..WHITE_HI
// blend band purely by chance, which addDropShadow would otherwise reveal
const SAFE_INTERIOR_DIST = 6;

const assets = path.resolve(import.meta.dirname, "../../..", "src", "assets", "crits", "riches");
const src = path.join(assets, "bull.jfif");
const dest = path.join(assets, "bull.png");

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
const floodQueue = new Int32Array(width * height);
let fqHead = 0;
let fqTail = 0;
function tryEnqueue(x, y) {
  const idx = y * width + x;
  if (isBackground[idx]) return;
  if (whitenessAt(x, y) <= FLOOD_LO) return;
  isBackground[idx] = 1;
  floodQueue[fqTail++] = idx;
}
for (let x = 0; x < width; x++) {
  tryEnqueue(x, 0);
  tryEnqueue(x, height - 1);
}
for (let y = 0; y < height; y++) {
  tryEnqueue(0, y);
  tryEnqueue(width - 1, y);
}
while (fqHead < fqTail) {
  const idx = floodQueue[fqHead++];
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
