import sharp from "sharp";
import path from "node:path";
import { addDropShadow } from "./lib/synthetic-drop-shadow.mjs";
import { keepLargestOpaqueComponent } from "./lib/keep-largest-component.mjs";

// raw src/assets/upgrade.jfif (AI-generated: a green up-arrow with a white "+"
// on a plain cream background) gets border-flood-fill chroma-keyed to
// transparent (same technique as process-shield.mjs/process-clock.mjs — the
// white "+" is enclosed INSIDE the arrow, never touching the image border, so
// a border-only flood fill correctly leaves it opaque while still clearing
// the actual cream background), then cropped to its own tight bounding box.
// The original art's own soft drop shadow gets clipped away along with the
// background by that same chroma-key (see synthetic-drop-shadow.mjs's own
// doc comment for why), so a fresh one is synthesized from the cropped
// icon's alpha silhouette instead. Then palette-quantized (same as the other
// special-crit icons) to keep the shipped file small. Writes to
// src/assets/upgrade.png; never overwrites the raw source.
const WHITE_LO = 140;
const WHITE_HI = 185;
const FLOOD_LO = 140;

const assets = path.resolve(import.meta.dirname, "..", "src", "assets");
const src = path.join(assets, "upgrade.jfif");
const dest = path.join(assets, "upgrade.png");

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

// the JFIF source's own compression leaves faint noise right around the
// icon's edge/former-shadow area — a few of those flecks land just under
// WHITE_HI and survive the fade above as a grainy, disconnected halo (the
// "ghost outline" the shadow fix alone didn't remove). The icon's real
// content (fill + outline + enclosed "+") is always one single connected
// blob, so discarding every other, smaller blob cleans this up completely
keepLargestOpaqueComponent(data, width, height, channels);

// tight bounding box of the remaining opaque content, requiring a real run of
// opaque pixels per row/column (not a stray low-alpha noise speck) before
// counting it as content — same fix process-shield.mjs/process-clock.mjs needed
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
