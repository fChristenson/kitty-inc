import sharp from "sharp";
import path from "node:path";

// src/assets/cloudCatSprites.jfif is a two-pose sheet (calm/meditating on the
// left, arms-up cheering on the right) on a plain near-white background. Cuts
// each pose out into its own transparent PNG for the city map's corner mascot
// (background/cityMap/cloudCat.ts).

const WHITENESS = 195;
const MIN_COMPONENT_PX = 120;

const assets = path.resolve(import.meta.dirname, "..", "src", "assets");
const out = path.resolve(import.meta.dirname, "..", "public");

async function cutPose(sourceRect, name) {
  const { data, info } = await sharp(path.join(assets, "cloudCatSprites.jfif"))
    .ensureAlpha()
    .extract(sourceRect)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const whiteness = (pixel) =>
    Math.min(...data.subarray(pixel * channels, pixel * channels + 3));
  // border-seeded so the cat's own cream fur and the white cloud stay opaque
  const background = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;
  const enqueue = (pixel) => {
    if (background[pixel] || whiteness(pixel) < WHITENESS) return;
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
  dropSpecks(data, width, height, channels);
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
  if (right < left || bottom < top) throw new Error(`Empty pose: ${name}`);
  // full color and 512px, unlike the palette-quantized 250px crit icons: this
  // one is drawn large enough on the map that 256 colors band the cloud
  await sharp(data, { raw: { width, height, channels } })
    .extract({ left, top, width: right - left + 1, height: bottom - top + 1 })
    .resize(512, 512, { fit: "inside", withoutEnlargement: true })
    .png({ compressionLevel: 9 })
    .toFile(path.join(out, `${name}.png`));
  console.log(`Processed ${name}.png`);
}

// chroma-key specks (stray JPEG noise) would otherwise inflate the crop box
function dropSpecks(data, width, height, channels) {
  const seen = new Uint8Array(width * height);
  const stack = new Int32Array(width * height);
  const component = new Int32Array(width * height);
  for (let start = 0; start < seen.length; start++) {
    if (seen[start] || data[start * channels + 3] <= 20) continue;
    let top = 0;
    let size = 0;
    stack[top++] = start;
    seen[start] = 1;
    while (top > 0) {
      const pixel = stack[--top];
      component[size++] = pixel;
      const column = pixel % width;
      const neighbours = [
        column > 0 ? pixel - 1 : -1,
        column + 1 < width ? pixel + 1 : -1,
        pixel >= width ? pixel - width : -1,
        pixel + width < seen.length ? pixel + width : -1,
      ];
      for (const next of neighbours) {
        if (next < 0 || seen[next] || data[next * channels + 3] <= 20) continue;
        seen[next] = 1;
        stack[top++] = next;
      }
    }
    if (size >= MIN_COMPONENT_PX) continue;
    for (let i = 0; i < size; i++) data[component[i] * channels + 3] = 0;
  }
}

const { width, height } = await sharp(
  path.join(assets, "cloudCatSprites.jfif"),
).metadata();
const half = Math.floor(width / 2);
await cutPose({ left: 0, top: 0, width: half, height }, "cloudCatIdle");
await cutPose(
  { left: half, top: 0, width: width - half, height },
  "cloudCatHappy",
);
