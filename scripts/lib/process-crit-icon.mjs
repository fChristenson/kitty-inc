import sharp from "sharp";
import path from "node:path";
import { copyFile } from "node:fs/promises";
import { dropSmallOpaqueComponents } from "./drop-small-components.mjs";

export async function processCritIcon(name, { backgroundSeeds = [] } = {}) {
  const assets = path.resolve(import.meta.dirname, "../../src/assets");
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
    if (background[pixel] || whiteness(pixel) < 195) return;
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
  for (const [column, row] of backgroundSeeds) {
    if (column < 0 || column >= width || row < 0 || row >= height) {
      throw new Error(`Invalid background seed for ${name}: ${column},${row}`);
    }
    enqueue(row * width + column);
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
    const column = pixel % width;
    const touchesContent =
      (column > 0 && !background[pixel - 1]) ||
      (column + 1 < width && !background[pixel + 1]) ||
      (pixel >= width && !background[pixel - width]) ||
      (pixel + width < background.length && !background[pixel + width]);
    data[pixel * channels + 3] = touchesContent
      ? Math.round(
          255 * Math.max(0, Math.min(1, (235 - whiteness(pixel)) / 40)),
        )
      : 0;
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
    right = Math.max(right, column);
    top = Math.min(top, row);
    bottom = Math.max(bottom, row);
  }
  if (right < left || bottom < top) throw new Error(`Empty crit icon: ${name}`);
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
}
