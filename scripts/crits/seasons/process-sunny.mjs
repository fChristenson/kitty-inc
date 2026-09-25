import sharp from "sharp";
import path from "node:path";
import { addDropShadow } from "../../lib/synthetic-drop-shadow.mjs";
import { keepLargestOpaqueComponent } from "../../lib/keep-largest-component.mjs";

// raw src/assets/sunny.jfif (a flat vector-style smiling sun with rays, on a
// plain near-white background) gets chroma-keyed to transparent, then
// cropped to its own tight bounding box. Sampled pixel values directly
// first: background whiteness (min channel) sits at ~249-253, the palest
// real content (the sun's own cream face fill) at ~166-202, and the rays'
// saturated orange well below that (~11-38) — a clean gap, same reasoning
// as process-heaven.mjs/process-halloween.mjs, so a plain per-pixel
// whiteness threshold (no border flood fill needed) correctly clears the
// background while leaving the cream face fully opaque. The rays+face are
// one single connected shape, so keepLargestOpaqueComponent discards any
// leftover chroma-key noise. Given a synthesized drop shadow (matching the
// other special-crit icons) and palette-quantized. Writes to
// src/assets/sunny.png; never overwrites the raw source. Backs the
// "Sunshine" crit's flash icon.
const WHITE_LO = 205;
const WHITE_HI = 235;

const assets = path.resolve(import.meta.dirname, "../../..", "src", "assets", "crits", "seasons");
const src = path.join(assets, "sunny.jfif");
const dest = path.join(assets, "sunny.png");

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

// the face's own cream fill has scattered small clusters of JPEG compression
// noise whose whiteness happens to dip into the WHITE_LO..WHITE_HI blend
// range purely by chance, punching tiny partial-transparency holes deep
// inside otherwise fully opaque content — invisible against a plain white
// background, but revealed as gray blotches once addDropShadow's black
// shadow layer sits behind them (see repo memory: "process the sunny image
// again"). A true silhouette edge is always within a few px of a fully
// transparent (background) pixel; a multi-source BFS distance-from-background
// transform confidently tells the two apart regardless of noise cluster size
// (a single-neighbor check alone missed multi-pixel clusters) — any
// non-fully-opaque pixel farther than SAFE_INTERIOR_DIST from the nearest
// alpha=0 pixel is unambiguously interior noise, not a real edge
const SAFE_INTERIOR_DIST = 6;
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
const cropped = await sharp(data, { raw: { width, height, channels } })
  .extract({ left: minX, top: minY, width: croppedW, height: croppedH })
  .ensureAlpha()
  .raw()
  .toBuffer();

const shadowed = await addDropShadow(cropped, croppedW, croppedH);

await sharp(shadowed.data, {
  raw: { width: shadowed.width, height: shadowed.height, channels: 4 },
})
  // only ever drawn as a small flash-text backdrop — small cap + palette
  // quantization keeps this in line with the other special-crit icons.
  // dither:0 — default ordered dithering speckled visible dark noise across
  // the face's large near-flat cream fill (subtle per-pixel JPEG noise in
  // the source got amplified into a blotchy stipple pattern once quantized)
  .resize(250, 250, { fit: "inside", withoutEnlargement: true })
  .png({ compressionLevel: 9, palette: true, dither: 0 })
  .toFile(dest);

const finalMeta = await sharp(dest).metadata();
console.log(
  `wrote ${path.relative(assets, dest)}: ${finalMeta.width}x${finalMeta.height}`,
);
