import sharp from "sharp";
import path from "node:path";

const assets = path.resolve(import.meta.dirname, "../../..", "src", "assets", "crits", "classics");
const src = path.join(assets, "firstClass.jfif");
const dest = path.join(assets, "firstClass.png");
const { data, info } = await sharp(src)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;
const white = (x, y) => {
  const i = (y * width + x) * channels;
  return Math.min(data[i], data[i + 1], data[i + 2]);
};
const bg = new Uint8Array(width * height);
const queue = new Int32Array(width * height);
let head = 0;
let tail = 0;
const enqueue = (x, y) => {
  const i = y * width + x;
  if (bg[i] || white(x, y) <= 210) return;
  bg[i] = 1;
  queue[tail++] = i;
};
for (let x = 0; x < width; x++) {
  enqueue(x, 0);
  enqueue(x, height - 1);
}
for (let y = 0; y < height; y++) {
  enqueue(0, y);
  enqueue(width - 1, y);
}
while (head < tail) {
  const i = queue[head++];
  const x = i % width;
  const y = (i / width) | 0;
  if (x > 0) enqueue(x - 1, y);
  if (x + 1 < width) enqueue(x + 1, y);
  if (y > 0) enqueue(x, y - 1);
  if (y + 1 < height) enqueue(x, y + 1);
}
let minX = width,
  minY = height,
  maxX = -1,
  maxY = -1;
for (let y = 0; y < height; y++)
  for (let x = 0; x < width; x++) {
    const i = y * width + x;
    if (bg[i]) {
      const v = white(x, y);
      data[i * channels + 3] = Math.min(
        data[i * channels + 3],
        v >= 240 ? 0 : v <= 210 ? 255 : Math.round(255 * (1 - (v - 210) / 30)),
      );
    }
    if (data[i * channels + 3] > 20) {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
await sharp(data, { raw: { width, height, channels } })
  .extract({
    left: minX,
    top: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  })
  .resize(250, 250, { fit: "inside", withoutEnlargement: true })
  .png({ compressionLevel: 9, palette: true })
  .toFile(dest);
console.log(`wrote ${path.relative(assets, dest)}`);
