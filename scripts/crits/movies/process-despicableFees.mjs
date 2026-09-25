import sharp from "sharp";
import path from "node:path";
import { dropSmallOpaqueComponents } from "../../lib/drop-small-components.mjs";

const root = path.resolve(import.meta.dirname, "../../..");
const assets = path.join(root, "src/assets/crits/movies");
const output = path.join(root, "public/crits/movies/despicableFees.png");
const { data, info } = await sharp(path.join(assets, "despicableFees.jfif"))
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;
const background = new Uint8Array(width * height);
const queue = new Int32Array(width * height);
const whiteness = (pixel) =>
  Math.min(...data.subarray(pixel * channels, pixel * channels + 3));
const isProtectedBelly = (column, row) => {
  const horizontal = (column - 620) / 300;
  const vertical = (row - 700) / 190;
  return horizontal * horizontal + vertical * vertical <= 1;
};
let head = 0;
let tail = 0;
const enqueue = (pixel) => {
  const column = pixel % width;
  const row = Math.floor(pixel / width);
  if (
    background[pixel] ||
    whiteness(pixel) < 195 ||
    isProtectedBelly(column, row)
  )
    return;
  background[pixel] = 1;
  queue[tail++] = pixel;
};

for (let column = 0; column < width; column++) {
  enqueue(column);
  enqueue((height - 1) * width + column);
}
for (let row = 0; row < height; row++) {
  enqueue(row * width);
  enqueue(row * width + width - 1);
}
while (head < tail) {
  const pixel = queue[head++];
  const column = pixel % width;
  if (column > 0) enqueue(pixel - 1);
  if (column + 1 < width) enqueue(pixel + 1);
  if (pixel >= width) enqueue(pixel - width);
  if (pixel + width < background.length) enqueue(pixel + width);
}
for (let pixel = 0; pixel < background.length; pixel++) {
  if (!background[pixel]) continue;
  data[pixel * channels + 3] = 0;
}
dropSmallOpaqueComponents(data, width, height, channels, 120);

let left = width;
let top = height;
let right = -1;
let bottom = -1;
for (let pixel = 0; pixel < background.length; pixel++) {
  if (data[pixel * channels + 3] <= 20) continue;
  const column = pixel % width;
  const row = Math.floor(pixel / width);
  left = Math.min(left, column);
  top = Math.min(top, row);
  right = Math.max(right, column);
  bottom = Math.max(bottom, row);
}
if (right < left || bottom < top) throw new Error("Empty Despicable Fees icon");
await sharp(data, { raw: { width, height, channels } })
  .extract({ left, top, width: right - left + 1, height: bottom - top + 1 })
  .resize(250, 250, { fit: "inside", withoutEnlargement: true })
  .png({ compressionLevel: 9, palette: true })
  .toFile(output);
console.log("Processed and copied despicableFees.png");
