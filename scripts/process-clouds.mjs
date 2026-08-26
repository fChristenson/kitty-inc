import sharp from "sharp";
import path from "node:path";
import fs from "node:fs/promises";

// raw src/assets/clouds.png (AI-generated: several distinct cloud shapes in one row
// on a plain white/off-white background) gets border-flood-fill chroma-keyed to
// transparent (same technique as scripts/process-cat-sprites.mjs — a cloud's own
// near-white fill stays opaque because it's enclosed by a darker outline stroke the
// fill can never cross), then each cloud is cropped to its own tight bounding box
// and written out as its own file in src/assets/clouds/ (no shared grid/frame size
// needed here, unlike the cat sheets, since clouds aren't animated). Safe to re-run
// any time src/assets/clouds.png is replaced; never overwrites the raw source file.

// whiteness (min of r/g/b) thresholds for the soft chroma-key edge applied to actual
// background pixels: at/above WHITE_HI is fully transparent, at/below WHITE_LO is
// fully opaque, linear between
const WHITE_LO = 200;
const WHITE_HI = 244;
// separate, looser threshold used only to decide flood-fill connectivity — lower
// than WHITE_LO so the fill can bridge the faint antialiased pixels right at a
// cloud's outline. A real dark outline pixel is always far below this, so the fill
// still can never leak inside a cloud's own near-white body
const FLOOD_LO = 150;

const assets = path.resolve(import.meta.dirname, "..", "src", "assets");
const src = path.join(assets, "clouds.png");
const outDir = path.join(assets, "clouds");

const { data, info } = await sharp(src)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;

function whitenessAt(x, y) {
  const i = (y * width + x) * channels;
  return Math.min(data[i], data[i + 1], data[i + 2]);
}

// flood-fill (BFS, 4-connected) starting only from the image border, expanding
// through any pixel lighter than FLOOD_LO
const isBackground = new Uint8Array(width * height);
const queue = new Int32Array(width * height);
let qHead = 0,
  qTail = 0;
function tryEnqueue(x, y) {
  const idx = y * width + x;
  if (isBackground[idx]) return;
  if (whitenessAt(x, y) <= FLOOD_LO) return;
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
  const x = idx % width,
    y = (idx / width) | 0;
  if (x > 0) tryEnqueue(x - 1, y);
  if (x < width - 1) tryEnqueue(x + 1, y);
  if (y > 0) tryEnqueue(x, y - 1);
  if (y < height - 1) tryEnqueue(x, y + 1);
}

// only background-flooded pixels get the soft chroma-key alpha; everything else
// (including any interior near-white cloud fill) is left fully opaque
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
    const i = pixelIdx * channels;
    data[i + 3] = Math.min(data[i + 3], alpha);
  }
}

// connected-component label every non-transparent pixel (8-connected, so a noise
// speck touching only diagonally still joins whatever it's next to) and discard any
// component smaller than a real cloud could ever be — leftover JPEG-compression
// noise specks in the "background" area occasionally survive chroma-keying as tiny
// isolated dark flecks, and a naive per-column tight bounding box would otherwise
// stretch a cloud's crop all the way out to one of those, leaving a huge blank gap
const MIN_COMPONENT_AREA = 400;
const componentId = new Int32Array(width * height).fill(-1);
const ccQueue = new Int32Array(width * height);
const components = [];
for (let sy = 0; sy < height; sy++) {
  for (let sx = 0; sx < width; sx++) {
    const startIdx = sy * width + sx;
    if (componentId[startIdx] !== -1) continue;
    if (data[startIdx * channels + 3] <= 10) continue;
    const id = components.length;
    let qHead = 0,
      qTail = 0;
    componentId[startIdx] = id;
    ccQueue[qTail++] = startIdx;
    let minX = sx,
      maxX = sx,
      minY = sy,
      maxY = sy;
    while (qHead < qTail) {
      const idx = ccQueue[qHead++];
      const x = idx % width,
        y = (idx / width) | 0;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx,
            ny = y + dy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          const nIdx = ny * width + nx;
          if (componentId[nIdx] !== -1) continue;
          if (data[nIdx * channels + 3] <= 10) continue;
          componentId[nIdx] = id;
          ccQueue[qTail++] = nIdx;
        }
      }
    }
    components.push({
      size: qTail,
      x0: minX,
      y0: minY,
      w: maxX - minX + 1,
      h: maxY - minY + 1,
    });
  }
}

const boxes = components
  .filter((c) => c.size >= MIN_COMPONENT_AREA)
  .sort((a, b) => a.x0 - b.x0);

await fs.mkdir(outDir, { recursive: true });
await Promise.all(
  boxes.map((b, i) =>
    sharp(data, { raw: { width, height, channels } })
      .extract({ left: b.x0, top: b.y0, width: b.w, height: b.h })
      .png()
      .toFile(path.join(outDir, `cloud${i}.png`)),
  ),
);

console.log(
  `wrote ${boxes.length} cloud(s) to clouds/: ${boxes.map((b) => `${b.w}x${b.h}`).join(", ")}`,
);
