import sharp from "sharp";
import path from "node:path";
import { addDropShadow } from "../../lib/synthetic-drop-shadow.mjs";
import { keepLargestOpaqueComponent } from "../../lib/keep-largest-component.mjs";

const WHITE_LO = 220;
const WHITE_HI = 245;
const FLOOD_LO = 220;
const assets = path.resolve(import.meta.dirname, "../../..", "src", "assets", "crits", "office");
const src = path.join(assets, "cloneArmy.jfif");
const dest = path.join(assets, "cloneArmy.png");
const { data, info } = await sharp(src)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;
const whitenessAt = (x, y) => {
  const i = (y * width + x) * channels;
  return Math.min(data[i], data[i + 1], data[i + 2]);
};
const isBackground = new Uint8Array(width * height);
const queue = new Int32Array(width * height);
let qHead = 0;
let qTail = 0;
function tryEnqueue(x, y) {
  const idx = y * width + x;
  if (isBackground[idx] || whitenessAt(x, y) <= FLOOD_LO) return;
  isBackground[idx] = 1;
  queue[qTail++] = idx;
}
for (let x = 0; x < width; x++) {
  tryEnqueue(x, 0);
  tryEnqueue(x, height - 1);
}
for (let y = 0; y < height; y++) {
  tryEnqueue(0, y);
  tryEnqueue(width - 1, y);
}
while (qHead < qTail) {
  const idx = queue[qHead++];
  const x = idx % width;
  const y = (idx / width) | 0;
  if (x > 0) tryEnqueue(x - 1, y);
  if (x < width - 1) tryEnqueue(x + 1, y);
  if (y > 0) tryEnqueue(x, y - 1);
  if (y < height - 1) tryEnqueue(x, y + 1);
}
for (let y = 0; y < height; y++)
  for (let x = 0; x < width; x++) {
    const pixelIdx = y * width + x;
    if (!isBackground[pixelIdx]) continue;
    const whiteness = whitenessAt(x, y);
    const alpha =
      whiteness >= WHITE_HI
        ? 0
        : whiteness <= WHITE_LO
          ? 255
          : Math.round(
              255 * (1 - (whiteness - WHITE_LO) / (WHITE_HI - WHITE_LO)),
            );
    data[pixelIdx * channels + 3] = Math.min(
      data[pixelIdx * channels + 3],
      alpha,
    );
  }
keepLargestOpaqueComponent(data, width, height, channels);
const alphaAt = (y, x) => data[(y * width + x) * channels + 3];
const cutoff = 20;
function firstOpaque(limit, span, get) {
  for (let a = 0; a < limit; a++) {
    let count = 0;
    for (let b = 0; b < span; b++) {
      if (get(a, b) > cutoff) {
        if (++count >= 20) return a;
      } else count = 0;
    }
  }
  return limit;
}
const minY = firstOpaque(height, width, (y, x) => alphaAt(y, x));
const maxY =
  height - 1 - firstOpaque(height, width, (y, x) => alphaAt(height - 1 - y, x));
const minX = firstOpaque(width, height, (x, y) => alphaAt(y, x));
const maxX =
  width - 1 - firstOpaque(width, height, (x, y) => alphaAt(y, width - 1 - x));
const croppedW = maxX - minX + 1;
const croppedH = maxY - minY + 1;
const cropped = await sharp(data, { raw: { width, height, channels } })
  .extract({ left: minX, top: minY, width: croppedW, height: croppedH })
  .ensureAlpha()
  .raw()
  .toBuffer();
const shadowed = await addDropShadow(cropped, croppedW, croppedH);
const outputWidth = Math.min(250, shadowed.width);
const outputHeight = Math.round(
  shadowed.height * (outputWidth / shadowed.width),
);
const resized = await sharp(shadowed.data, {
  raw: { width: shadowed.width, height: shadowed.height, channels: 4 },
})
  .resize(250, 250, { fit: "inside", withoutEnlargement: true })
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
await sharp(resized.data, {
  raw: {
    width: resized.info.width,
    height: resized.info.height,
    channels: resized.info.channels,
  },
})
  .png({ compressionLevel: 9, palette: true })
  .toFile(dest);
console.log(`wrote ${path.relative(assets, dest)}`);
