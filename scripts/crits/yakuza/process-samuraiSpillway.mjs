import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { processCritIcon } from "../../lib/process-crit-icon.mjs";

// The source is a sticker with a thick black stroke around its white ring,
// which the border fill can't cross. Whiten that stroke first so the fill
// runs through backdrop, stroke and ring up to the real outline.
const source = path.resolve(
  import.meta.dirname,
  "../../../src/assets/crits/yakuza/samuraiSpillway.jfif",
);
const { data, info } = await sharp(source)
  .raw()
  .toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;
const light = (pixel) =>
  Math.min(
    data[pixel * channels],
    data[pixel * channels + 1],
    data[pixel * channels + 2],
  ) >= 195;
const backdrop = new Uint8Array(width * height);
const stroke = new Uint8Array(width * height);
const flood = (seeds, mark, accepts) => {
  const queue = [];
  for (const pixel of seeds) {
    if (mark[pixel] || !accepts(pixel)) continue;
    mark[pixel] = 1;
    queue.push(pixel);
  }
  while (queue.length) {
    const pixel = queue.pop();
    const column = pixel % width;
    for (const next of [
      column > 0 ? pixel - 1 : -1,
      column + 1 < width ? pixel + 1 : -1,
      pixel - width,
      pixel + width,
    ]) {
      if (next < 0 || next >= mark.length || mark[next] || !accepts(next))
        continue;
      mark[next] = 1;
      queue.push(next);
    }
  }
};
const border = [];
for (let column = 0; column < width; column++)
  border.push(column, (height - 1) * width + column);
for (let row = 0; row < height; row++)
  border.push(row * width, row * width + width - 1);
flood(border, backdrop, light);
const strokeSeeds = [];
for (let pixel = 0; pixel < backdrop.length; pixel++) {
  if (!backdrop[pixel]) continue;
  const column = pixel % width;
  if (column + 1 < width && !backdrop[pixel + 1]) strokeSeeds.push(pixel + 1);
  if (column > 0 && !backdrop[pixel - 1]) strokeSeeds.push(pixel - 1);
  if (pixel + width < backdrop.length && !backdrop[pixel + width])
    strokeSeeds.push(pixel + width);
  if (pixel >= width && !backdrop[pixel - width])
    strokeSeeds.push(pixel - width);
}
flood(strokeSeeds, stroke, (pixel) => !light(pixel));
for (let pixel = 0; pixel < stroke.length; pixel++) {
  if (stroke[pixel]) data.fill(255, pixel * channels, pixel * channels + 3);
}
const unstroked = path.join(os.tmpdir(), "samuraiSpillway-unstroked.png");
await sharp(data, { raw: { width, height, channels } }).png().toFile(unstroked);
await processCritIcon("samuraiSpillway", {
  sourcePath: unstroked,
  // the gap under the blade is walled in by the stand
  backgroundSeeds: [[579, 221]],
  copyToAssetDirectories: true,
});
