import sharp from "sharp";
import path from "node:path";
import { copyFile } from "node:fs/promises";
import { keepLargestOpaqueComponent } from "./lib/keep-largest-component.mjs";

// Tailored processor: unlike every other crit source, this art ships as a
// "sticker" — a thick white ring around the figures, fenced off by its own thin
// mid-gray stroke that the shared border flood fill cannot cross. One seed
// inside the ring clears the whole band; clearing the leftover stroke and
// keeping the largest opaque component then discards the halo entirely.
const RING_SEED = [380, 416];
const FLOOD_LO = 195;
const WHITE_LO = 195;
const WHITE_HI = 235;
const STROKE_LO = 120; // the sticker stroke is lighter than any real outline

const name = "tangoTender";
const assets = path.resolve(import.meta.dirname, "../src/assets");
const { data, info } = await sharp(path.join(assets, `${name}.jfif`))
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;
const background = new Uint8Array(width * height);
const queue = new Int32Array(width * height);
let head = 0;
let tail = 0;
const whiteness = (pixel) =>
  Math.min(...data.subarray(pixel * channels, pixel * channels + 3));
const enqueue = (pixel) => {
  if (background[pixel] || whiteness(pixel) < FLOOD_LO) return;
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
enqueue(RING_SEED[1] * width + RING_SEED[0]);
while (head < tail) {
  const pixel = queue[head++];
  const column = pixel % width;
  if (column > 0) enqueue(pixel - 1);
  if (column + 1 < width) enqueue(pixel + 1);
  if (pixel >= width) enqueue(pixel - width);
  if (pixel + width < background.length) enqueue(pixel + width);
}
const neighbours = (pixel) => {
  const column = pixel % width;
  const list = [];
  if (column > 0) list.push(pixel - 1);
  if (column + 1 < width) list.push(pixel + 1);
  if (pixel >= width) list.push(pixel - width);
  if (pixel + width < background.length) list.push(pixel + width);
  return list;
};
for (let pixel = 0; pixel < background.length; pixel++) {
  if (!background[pixel]) continue;
  const touchesContent = neighbours(pixel).some((n) => !background[n]);
  data[pixel * channels + 3] = touchesContent
    ? Math.round(
        255 *
          Math.max(
            0,
            Math.min(1, (WHITE_HI - whiteness(pixel)) / (WHITE_HI - WHITE_LO)),
          ),
      )
    : 0;
}
// the sticker's own stroke survives the fill on both of its sides; clear it
// before the component pass so it can never reconnect to the real artwork
for (let pass = 0; pass < 6; pass++) {
  for (let pixel = 0; pixel < background.length; pixel++) {
    if (background[pixel] || whiteness(pixel) < STROKE_LO) continue;
    if (!neighbours(pixel).some((n) => background[n])) continue;
    background[pixel] = 1;
    data[pixel * channels + 3] = 0;
  }
}
keepLargestOpaqueComponent(data, width, height, channels);
let left = width;
let top = height;
let right = -1;
let bottom = -1;
for (let pixel = 0; pixel < background.length; pixel++) {
  if (data[pixel * channels + 3] <= 20) continue;
  const column = pixel % width;
  const row = Math.floor(pixel / width);
  left = Math.min(left, column);
  right = Math.max(right, column);
  top = Math.min(top, row);
  bottom = Math.max(bottom, row);
}
const destination = path.join(assets, `${name}.png`);
await sharp(data, { raw: { width, height, channels } })
  .extract({ left, top, width: right - left + 1, height: bottom - top + 1 })
  .resize(250, 250, { fit: "inside", withoutEnlargement: true })
  .png({ compressionLevel: 9, palette: true })
  .toFile(destination);
await copyFile(
  destination,
  path.join(assets, "themes/references/dist", `${name}.png`),
);
console.log(`Processed and copied ${name}.png`);
