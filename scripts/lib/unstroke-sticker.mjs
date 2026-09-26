import os from "node:os";
import path from "node:path";
import sharp from "sharp";

// Sticker sources wrap the subject in a white ring fenced off by an outer
// stroke (black or mid-gray) that the border-seeded fill can't cross. This
// whitens every non-light pixel connected to the backdrop — that stroke —
// and writes the result to a temp PNG to pass as processCritIcon's sourcePath,
// so the fill then runs through backdrop, stroke and ring up to the real
// outline. Only use it when the ring fully separates stroke from subject;
// `maxRow` stops it above a ground line the stroke and subject both touch.
export async function unstrokeSticker(
  sourcePath,
  name,
  { maxRow = Infinity } = {},
) {
  const { data, info } = await sharp(sourcePath)
    .removeAlpha()
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
  flood(
    strokeSeeds,
    stroke,
    (pixel) => !light(pixel) && Math.floor(pixel / width) <= maxRow,
  );
  for (let pixel = 0; pixel < stroke.length; pixel++) {
    if (stroke[pixel]) data.fill(255, pixel * channels, pixel * channels + 3);
  }
  const unstroked = path.join(os.tmpdir(), `${name}-unstroked.png`);
  await sharp(data, { raw: { width, height, channels } })
    .png()
    .toFile(unstroked);
  return unstroked;
}
