import sharp from "sharp";
import path from "node:path";
import { keepLargestOpaqueComponent } from "./keep-largest-component.mjs";
import { writeCritSticker } from "./sticker-border.mjs";
import { critIconDir, critIconFile } from "./crit-asset-paths.mjs";

// Variant of process-crit-icon.mjs for "sticker" sources: art that ships with a
// thick white ring around the subject, fenced off from the real background by
// the sticker's own thin mid-gray stroke. The shared border-seeded fill cannot
// cross that stroke, so it leaves a white halo. One seed inside the ring clears
// the whole connected band; eroding the leftover stroke and keeping only the
// largest opaque component then stops it surviving as a floating outline.
//
// Only reach for this when a magenta-composite check actually shows a halo —
// keepLargestOpaqueComponent would discard genuinely detached artwork. Pass
// extraSeeds when the subject breaks the ring into separate arcs, and keep every
// seed out of white artwork (a chef's hat, a white coat) that must survive.
const FLOOD_LO = 195;
const WHITE_LO = 195;
const WHITE_HI = 235;
const STROKE_LO = 120; // the sticker stroke is lighter than any real outline
const STROKE_EROSION_PASSES = 6;

export async function processStickerCritIcon(
  name,
  { ringSeed, extraSeeds = [] },
) {
  const assets = path.resolve(import.meta.dirname, "../../src/assets");
  const critAssets = path.resolve(import.meta.dirname, "../../public");
  const { data, info } = await sharp(
    path.join(assets, critIconDir(name), `${name}.jfif`),
  )
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
  const neighbours = (pixel) => {
    const column = pixel % width;
    const list = [];
    if (column > 0) list.push(pixel - 1);
    if (column + 1 < width) list.push(pixel + 1);
    if (pixel >= width) list.push(pixel - width);
    if (pixel + width < background.length) list.push(pixel + width);
    return list;
  };
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
  for (const [column, row] of [ringSeed, ...extraSeeds]) {
    const seed = row * width + column;
    if (whiteness(seed) < FLOOD_LO) {
      throw new Error(`Seed ${column},${row} for ${name} is not on the ring`);
    }
    enqueue(seed);
  }
  while (head < tail) {
    const pixel = queue[head++];
    for (const neighbour of neighbours(pixel)) enqueue(neighbour);
  }
  for (let pixel = 0; pixel < background.length; pixel++) {
    if (!background[pixel]) continue;
    const touchesContent = neighbours(pixel).some((n) => !background[n]);
    data[pixel * channels + 3] = touchesContent
      ? Math.round(
          255 *
            Math.max(
              0,
              Math.min(
                1,
                (WHITE_HI - whiteness(pixel)) / (WHITE_HI - WHITE_LO),
              ),
            ),
        )
      : 0;
  }
  for (let pass = 0; pass < STROKE_EROSION_PASSES; pass++) {
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
  if (right < left || bottom < top) throw new Error(`Empty crit icon: ${name}`);
  const destination = path.join(critAssets, critIconFile(name));
  await sharp(data, { raw: { width, height, channels } })
    .extract({ left, top, width: right - left + 1, height: bottom - top + 1 })
    .resize(250, 250, { fit: "inside", withoutEnlargement: true })
    .png({ compressionLevel: 9, palette: true })
    .toFile(destination);
  await writeCritSticker(name);
  console.log(`Processed and copied ${name}.png`);
}
