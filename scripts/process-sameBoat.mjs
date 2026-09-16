import sharp from "sharp";
import path from "node:path";
import fs from "node:fs/promises";
import { addDropShadow } from "./lib/synthetic-drop-shadow.mjs";
import { keepLargestOpaqueComponent } from "./lib/keep-largest-component.mjs";

// Same Boat's near-white illustrated background is removed from the border
// inward so enclosed light details remain part of the icon.
const WHITE_LO = 195;
const WHITE_HI = 235;
const FLOOD_LO = 195;
const assets = path.resolve(import.meta.dirname, "..", "src", "assets");
const src = path.join(assets, "sameBoat.jfif");
const dest = path.join(assets, "sameBoat.png");
const themeDest = path.join(
  assets,
  "themes",
  "references",
  "dist",
  "sameBoat.png",
);

const { data, info } = await sharp(src)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;
const whitenessAt = (x, y) => {
  const i = (y * width + x) * channels;
  return Math.min(data[i], data[i + 1], data[i + 2]);
};
const isBackground = new Uint8Array(width * height);
const queue = new Int32Array(width * height);
let qHead = 0;
let qTail = 0;
function tryEnqueue(x, y) {
  const idx = y * width + x;
  if (isBackground[idx] || whitenessAt(x, y) <= FLOOD_LO) return;
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
    data[pixelIdx * channels + 3] = Math.min(
      data[pixelIdx * channels + 3],
      alpha,
    );
  }
}
keepLargestOpaqueComponent(data, width, height, channels);
const alphaAt = (y, x) => data[(y * width + x) * channels + 3];
const cutoff = 20;
function firstOpaque(limit, span, get) {
  for (let a = 0; a < limit; a++) {
    let run = 0;
    for (let b = 0; b < span; b++) {
      if (get(a, b) > cutoff) {
        if (++run >= 8) return a;
      } else run = 0;
    }
  }
  return limit;
}
const minY = firstOpaque(height, width, (y, x) => alphaAt(y, x));
const maxY =
  height - 1 - firstOpaque(height, width, (y, x) => alphaAt(height - 1 - y, x));
const minX = firstOpaque(width, height, (x, y) => alphaAt(y, x));
const maxX =
  width - 1 - firstOpaque(width, height, (x, y) => alphaAt(y, width - 1 - x));
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
await fs.copyFile(dest, themeDest);
console.log(
  `wrote ${path.relative(assets, dest)} + ${path.relative(assets, themeDest)}`,
);
