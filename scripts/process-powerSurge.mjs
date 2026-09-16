import sharp from "sharp";
import path from "node:path";

const assets = path.resolve(import.meta.dirname, "..", "src", "assets");
const src = path.join(assets, "powerSurge.jfif");
const dest = path.join(assets, "powerSurge.png");
const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;
const white = (x, y) => {
  const i = (y * width + x) * channels;
  return Math.min(data[i], data[i + 1], data[i + 2]);
};
const bg = new Uint8Array(width * height);
const queue = new Int32Array(width * height);
let head = 0;
let tail = 0;
const add = (x, y) => {
  const i = y * width + x;
  if (bg[i] || white(x, y) <= 210) return;
  bg[i] = 1;
  queue[tail++] = i;
};
for (let x = 0; x < width; x++) { add(x, 0); add(x, height - 1); }
for (let y = 0; y < height; y++) { add(0, y); add(width - 1, y); }
while (head < tail) {
  const i = queue[head++];
  const x = i % width;
  const y = (i / width) | 0;
  if (x > 0) add(x - 1, y);
  if (x + 1 < width) add(x + 1, y);
  if (y > 0) add(x, y - 1);
  if (y + 1 < height) add(x, y + 1);
}
let minX = width, minY = height, maxX = -1, maxY = -1;
for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
  const i = y * width + x;
  if (!bg[i]) {
    const alpha = data[i * channels + 3];
    if (alpha > 20) { minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); }
    continue;
  }
  const value = white(x, y);
  data[i * channels + 3] = Math.min(data[i * channels + 3], value >= 240 ? 0 : value <= 210 ? 255 : Math.round(255 * (1 - (value - 210) / 30)));
}
await sharp(data, { raw: { width, height, channels } }).extract({ left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 }).resize(250, 250, { fit: "inside", withoutEnlargement: true }).png({ compressionLevel: 9, palette: true }).toFile(dest);
console.log(`wrote ${path.relative(assets, dest)}`);
