import sharp from "sharp";
import path from "node:path";
import fs from "node:fs/promises";
import { addDropShadow } from "../../lib/synthetic-drop-shadow.mjs";
import { dropSmallOpaqueComponents } from "../../lib/drop-small-components.mjs";

const WHITE_LO = 220;
const WHITE_HI = 245;
const FLOOD_LO = 220;
const assets = path.resolve(import.meta.dirname, "../../..", "src", "assets", "crits", "classics");
const src = path.join(assets, "skip.jfif");
const dest = path.join(assets, "skip.png");
const shippedDest = path.join(assets, "..", "..", "processedCrits", "classics", "skip.png");

const { data, info } = await sharp(src)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;
const whitenessAt = (x, y) => {
  const i = (y * width + x) * channels;
  return Math.min(data[i], data[i + 1], data[i + 2]);
};
const background = new Uint8Array(width * height);
const queue = new Int32Array(width * height);
let head = 0;
let tail = 0;
function enqueue(x, y) {
  const index = y * width + x;
  if (background[index] || whitenessAt(x, y) <= FLOOD_LO) return;
  background[index] = 1;
  queue[tail++] = index;
}
for (let x = 0; x < width; x++) {
  enqueue(x, 0);
  enqueue(x, height - 1);
}
for (let y = 0; y < height; y++) {
  enqueue(0, y);
  enqueue(width - 1, y);
}
while (head < tail) {
  const index = queue[head++];
  const x = index % width;
  const y = (index / width) | 0;
  if (x > 0) enqueue(x - 1, y);
  if (x + 1 < width) enqueue(x + 1, y);
  if (y > 0) enqueue(x, y - 1);
  if (y + 1 < height) enqueue(x, y + 1);
}
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const pixel = y * width + x;
    if (!background[pixel]) continue;
    const whiteness = whitenessAt(x, y);
    const alpha = whiteness >= WHITE_HI
      ? 0
      : whiteness <= WHITE_LO
        ? 255
        : Math.round(255 * (1 - (whiteness - WHITE_LO) / (WHITE_HI - WHITE_LO)));
    data[pixel * channels + 3] = Math.min(data[pixel * channels + 3], alpha);
  }
}
dropSmallOpaqueComponents(data, width, height, channels, 120);
let minX = width, minY = height, maxX = -1, maxY = -1;
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    if (data[(y * width + x) * channels + 3] <= 20) continue;
    minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
}
const croppedW = maxX - minX + 1;
const croppedH = maxY - minY + 1;
const cropped = await sharp(data, { raw: { width, height, channels } })
  .extract({ left: minX, top: minY, width: croppedW, height: croppedH })
  .ensureAlpha().raw().toBuffer();
const shadowed = await addDropShadow(cropped, croppedW, croppedH);
await sharp(shadowed.data, {
  raw: { width: shadowed.width, height: shadowed.height, channels: 4 },
})
  .resize(250, 250, { fit: "inside", withoutEnlargement: true })
  .png({ compressionLevel: 9, palette: true })
  .toFile(dest);
await fs.copyFile(dest, shippedDest);
const finalMeta = await sharp(dest).metadata();
console.log(`wrote ${path.relative(assets, dest)} and ${path.relative(assets, shippedDest)}: ${finalMeta.width}x${finalMeta.height}`);