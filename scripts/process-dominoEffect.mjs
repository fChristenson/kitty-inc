import sharp from "sharp";
import path from "node:path";

// Process the dominoEffect backdrop as a transparent cutout. The border flood
// fill preserves light domino faces and pips enclosed by the darker outlines.
const WHITE_LO = 170;
const WHITE_HI = 220;
const FLOOD_LO = 170;

const assets = path.resolve(import.meta.dirname, "..", "src", "assets");
const src = path.join(assets, "dominoEffect.jfif");
const dest = path.join(assets, "dominoEffect.png");

const { data, info } = await sharp(src)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;

const whitenessAt = (x, y) => {
  const index = (y * width + x) * channels;
  return Math.min(data[index], data[index + 1], data[index + 2]);
};
const isBackground = new Uint8Array(width * height);
const queue = new Int32Array(width * height);
let queueHead = 0;
let queueTail = 0;

function tryEnqueue(x, y) {
  const index = y * width + x;
  if (isBackground[index] || whitenessAt(x, y) <= FLOOD_LO) return;
  isBackground[index] = 1;
  queue[queueTail++] = index;
}

for (let x = 0; x < width; x++) {
  tryEnqueue(x, 0);
  tryEnqueue(x, height - 1);
}
for (let y = 0; y < height; y++) {
  tryEnqueue(0, y);
  tryEnqueue(width - 1, y);
}
while (queueHead < queueTail) {
  const index = queue[queueHead++];
  const x = index % width;
  const y = (index / width) | 0;
  if (x > 0) tryEnqueue(x - 1, y);
  if (x < width - 1) tryEnqueue(x + 1, y);
  if (y > 0) tryEnqueue(x, y - 1);
  if (y < height - 1) tryEnqueue(x, y + 1);
}

for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const pixelIndex = y * width + x;
    if (!isBackground[pixelIndex]) continue;
    const whiteness = whitenessAt(x, y);
    const alpha =
      whiteness >= WHITE_HI
        ? 0
        : whiteness <= WHITE_LO
          ? 255
          : Math.round(
              255 * (1 - (whiteness - WHITE_LO) / (WHITE_HI - WHITE_LO)),
            );
    data[pixelIndex * channels + 3] = Math.min(
      data[pixelIndex * channels + 3],
      alpha,
    );
  }
}

const alphaAt = (y, x) => data[(y * width + x) * channels + 3];
let minX = width;
let minY = height;
let maxX = -1;
let maxY = -1;
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    if (alphaAt(y, x) <= 20) continue;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
}

await sharp(data, { raw: { width, height, channels } })
  .extract({
    left: minX,
    top: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  })
  .resize(250, 250, { fit: "inside", withoutEnlargement: true })
  .png({ compressionLevel: 9, palette: true })
  .toFile(dest);

const finalMeta = await sharp(dest).metadata();
console.log(
  `wrote ${path.relative(assets, dest)}: ${finalMeta.width}x${finalMeta.height}`,
);
