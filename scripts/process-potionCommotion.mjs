import sharp from "sharp";
import path from "node:path";
import { writeCritSticker } from "./lib/sticker-border.mjs";

const source = path.resolve(import.meta.dirname, "../src/assets/potionCommotion.jfif");
const destination = path.resolve(import.meta.dirname, "../public/potionCommotion.png");
const { data, info } = await sharp(source)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;
const background = [57, 61, 62];
const tolerance = 28;
const seen = new Uint8Array(width * height);
const queue = new Int32Array(width * height);
let head = 0;
let tail = 0;
const distance = (pixel) => {
  const base = pixel * channels;
  return Math.hypot(
    data[base] - background[0],
    data[base + 1] - background[1],
    data[base + 2] - background[2],
  );
};
const enqueue = (pixel) => {
  if (seen[pixel] || distance(pixel) > tolerance) return;
  seen[pixel] = 1;
  queue[tail++] = pixel;
};
for (let x = 0; x < width; x++) {
  enqueue(x);
  enqueue((height - 1) * width + x);
}
for (let y = 0; y < height; y++) {
  enqueue(y * width);
  enqueue(y * width + width - 1);
}
while (head < tail) {
  const pixel = queue[head++];
  const x = pixel % width;
  if (x > 0) enqueue(pixel - 1);
  if (x + 1 < width) enqueue(pixel + 1);
  if (pixel >= width) enqueue(pixel - width);
  if (pixel + width < seen.length) enqueue(pixel + width);
}
for (let pixel = 0; pixel < seen.length; pixel++) {
  if (seen[pixel]) data[pixel * channels + 3] = 0;
}
await sharp(data, { raw: { width, height, channels } })
  .resize(250, 250, { fit: "inside", withoutEnlargement: true })
  .png({ compressionLevel: 9, palette: true })
  .toFile(destination);
await writeCritSticker("potionCommotion");
console.log("Processed and copied potionCommotion.png");
