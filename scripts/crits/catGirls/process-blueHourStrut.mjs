import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { processCritIcon } from "../../lib/process-crit-icon.mjs";

// The figure sits on a vivid blue sticker backing with a thin dark outer
// stroke. Whiten the blue, plus the dark pixels hugging both the backdrop and
// the blue (that stroke), so the usual fill clears the whole backing.
const STROKE_REACH = 4;
const source = path.resolve(
  import.meta.dirname,
  "../../../src/assets/crits/catGirls/blueHourStrut.jfif",
);
const { data, info } = await sharp(source)
  .raw()
  .toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;
const rgb = (pixel) => data.subarray(pixel * channels, pixel * channels + 3);
const isLight = (pixel) => Math.min(...rgb(pixel)) >= 195;
const isBlue = (pixel) => {
  const [r, , b] = rgb(pixel);
  return b > 170 && r < 110 && b - r > 100;
};
// steps from each pixel to the nearest pixel in `mask`, capped at `reach`
const distanceTo = (mask, reach) => {
  const distance = new Uint8Array(width * height).fill(255);
  let frontier = [];
  for (let pixel = 0; pixel < mask.length; pixel++) {
    if (mask[pixel]) {
      distance[pixel] = 0;
      frontier.push(pixel);
    }
  }
  for (let step = 1; step <= reach && frontier.length; step++) {
    const next = [];
    for (const pixel of frontier) {
      const column = pixel % width;
      for (const neighbor of [
        column > 0 ? pixel - 1 : -1,
        column + 1 < width ? pixel + 1 : -1,
        pixel - width,
        pixel + width,
      ]) {
        if (neighbor < 0 || neighbor >= distance.length) continue;
        if (distance[neighbor] <= step) continue;
        distance[neighbor] = step;
        next.push(neighbor);
      }
    }
    frontier = next;
  }
  return distance;
};
const backdrop = new Uint8Array(width * height);
const queue = [];
const seed = (pixel) => {
  if (backdrop[pixel] || !isLight(pixel)) return;
  backdrop[pixel] = 1;
  queue.push(pixel);
};
for (let column = 0; column < width; column++) {
  seed(column);
  seed((height - 1) * width + column);
}
for (let row = 0; row < height; row++) {
  seed(row * width);
  seed(row * width + width - 1);
}
while (queue.length) {
  const pixel = queue.pop();
  const column = pixel % width;
  if (column > 0) seed(pixel - 1);
  if (column + 1 < width) seed(pixel + 1);
  if (pixel >= width) seed(pixel - width);
  if (pixel + width < backdrop.length) seed(pixel + width);
}
const blue = new Uint8Array(width * height);
for (let pixel = 0; pixel < blue.length; pixel++) blue[pixel] = isBlue(pixel) ? 1 : 0;
const nearBackdrop = distanceTo(backdrop, STROKE_REACH);
const nearBlue = distanceTo(blue, STROKE_REACH);
for (let pixel = 0; pixel < blue.length; pixel++) {
  const stroke =
    nearBackdrop[pixel] <= STROKE_REACH && nearBlue[pixel] <= STROKE_REACH;
  if (blue[pixel] || stroke) data.fill(255, pixel * channels, pixel * channels + 3);
}
const unbacked = path.join(os.tmpdir(), "blueHourStrut-unbacked.png");
await sharp(data, { raw: { width, height, channels } }).png().toFile(unbacked);
await processCritIcon("blueHourStrut", {
  sourcePath: unbacked,
  copyToAssetDirectories: true,
});
