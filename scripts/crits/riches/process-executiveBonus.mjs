import sharp from "sharp";
import path from "node:path";

const WHITE_LO = 210;
const WHITE_HI = 240;
const FLOOD_LO = 210;
const assets = path.resolve(import.meta.dirname, "../../..", "src", "assets", "crits", "riches");
const src = path.join(assets, "executiveBonus.jfif");
const dest = path.join(assets, "executiveBonus.png");

const { data, info } = await sharp(src)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;
const whitenessAt = (x, y) => {
  const index = (y * width + x) * channels;
  return Math.min(data[index], data[index + 1], data[index + 2]);
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
    const alpha =
      whiteness >= WHITE_HI
        ? 0
        : whiteness <= WHITE_LO
          ? 255
          : Math.round(
              255 * (1 - (whiteness - WHITE_LO) / (WHITE_HI - WHITE_LO)),
            );
    data[pixel * channels + 3] = Math.min(data[pixel * channels + 3], alpha);
  }
}

let minX = width;
let minY = height;
let maxX = -1;
let maxY = -1;
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    if (data[(y * width + x) * channels + 3] <= 20) continue;
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

const meta = await sharp(dest).metadata();
console.log(
  `wrote ${path.relative(assets, dest)}: ${meta.width}x${meta.height}`,
);
