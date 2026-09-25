import sharp from "sharp";
import path from "node:path";
import fs from "node:fs/promises";
import { addDropShadow } from "../../lib/synthetic-drop-shadow.mjs";
import { keepLargestOpaqueComponent } from "../../lib/keep-largest-component.mjs";

const WHITE_LO = 180;
const WHITE_HI = 225;
const FLOOD_LO = 180;
const assets = path.resolve(import.meta.dirname, "../../..", "src", "assets", "crits", "seasons");
const src = path.join(assets, "spendingFreeze.jfif");
const dest = path.join(assets, "spendingFreeze.png");
const themeDest = path.join(assets, "..", "..", "themes", "references", "dist", "crits", "seasons",
  "spendingFreeze.png",
);

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
for (let y = 0; y < height; y++) {
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
}
keepLargestOpaqueComponent(data, width, height, channels);
const shadowed = await addDropShadow(data, width, height);
await sharp(shadowed.data, {
  raw: { width: shadowed.width, height: shadowed.height, channels: 4 },
})
  .resize(250, 250, { fit: "inside", withoutEnlargement: true })
  .png({ compressionLevel: 9, palette: true })
  .toFile(dest);
await fs.copyFile(dest, themeDest);
console.log(
  `wrote ${path.relative(assets, dest)} + ${path.relative(assets, themeDest)}`,
);
