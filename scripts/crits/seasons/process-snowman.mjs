import sharp from "sharp";
import path from "node:path";
import { addDropShadow } from "../../lib/synthetic-drop-shadow.mjs";
import { dropSmallOpaqueComponents } from "../../lib/drop-small-components.mjs";

// raw src/assets/snowman.jfif (a flat vector-style snowman in a top hat and
// scarf, on a plain near-white background, with its own soft drop shadow)
// gets border-flood-fill chroma-keyed to transparent — UNLIKE every other
// special-crit icon so far, this source's own body fill is white too (same
// ~250-253 whiteness as the real background), so a plain per-pixel whiteness
// threshold would erase the body right along with the background. Only
// connectivity tells them apart: the body is fully enclosed by its own dark
// outline stroke (~30-75 whiteness), so a BFS seeded from the image border
// (same technique as process-shield.mjs/process-clock.mjs) can never cross
// that outline to reach the interior, leaving the white body opaque while
// still clearing the true background AND the shadow (~218-234 whiteness,
// well within the flood-fill's reach from every direction, and cleared by
// the same whiteness fade below). Verified this holds with a throwaway
// render before committing to these thresholds — the body, hat, scarf, arms,
// eyes, and buttons all survive; only the background/shadow disappear.
//
// The eyes/buttons/nose are each their own small opaque blob, fully
// disconnected from the outline/hat/scarf/arms — a real multi-part scene,
// so dropSmallOpaqueComponents (area-floor noise cleanup) is used instead of
// keepLargestOpaqueComponent, which would have erased every button/eye.
const WHITE_LO = 150;
const WHITE_HI = 210;
const FLOOD_LO = 150;
const MIN_KEEP_AREA = 200;

const assets = path.resolve(import.meta.dirname, "../../..", "src", "assets", "crits", "seasons");
const src = path.join(assets, "snowman.jfif");
const dest = path.join(assets, "snowman.png");

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

dropSmallOpaqueComponents(data, width, height, channels, MIN_KEEP_AREA);

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
  // quantization keeps this in line with the other special-crit icons
  .resize(250, 250, { fit: "inside", withoutEnlargement: true })
  .png({ compressionLevel: 9, palette: true })
  .toFile(dest);

const finalMeta = await sharp(dest).metadata();
console.log(
  `wrote ${path.relative(assets, dest)}: ${finalMeta.width}x${finalMeta.height}`,
);
