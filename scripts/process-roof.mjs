import sharp from "sharp";
import path from "node:path";
import fs from "node:fs/promises";
import { resolveThemeDirs } from "./lib/theme-dirs.mjs";

// raw roof.jfif (AI-generated: a rooftop parapet ledge with a water tank
// and vent pipe on top, against a plain white sky), dropped into a theme's own
// src/assets/themes/<theme>/ folder, gets border-flood-fill chroma-keyed to
// transparent (same technique as process-clouds.mjs — the parapet's own light
// concrete fill stays opaque because it's enclosed by a darker outline the fill
// can never cross), then trimmed down to its own tight bounding box so the huge
// blank sky above the water tank doesn't get drawn as part of the roof. The
// parapet spans the image edge-to-edge, so trimming never touches its width
// (already FLOOR_W-sized). Writes to that theme's own dist/roof.png. Pass
// --theme=<name> to process a theme other than the default "references"; never
// overwrites the raw source.

const WHITE_LO = 200;
const WHITE_HI = 244;
const FLOOD_LO = 150;

const assets = path.resolve(import.meta.dirname, "..", "src", "assets");
const { theme, themeDir, distDir } = resolveThemeDirs(assets);
const src = path.join(themeDir, "roof.jfif");
const dest = path.join(distDir, "roof.png");
await fs.mkdir(distDir, { recursive: true });

const { data, info } = await sharp(src)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;

function whitenessAt(x, y) {
  const i = (y * width + x) * channels;
  return Math.min(data[i], data[i + 1], data[i + 2]);
}

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

// find the tight bounding box of remaining opaque content ourselves — sharp's own
// trim() bailed out here because scattered single-pixel JPEG-noise specks (alpha
// just above 0) reach all the way to the raw image's top edge, so a "does this row
// contain any non-background pixel" check trims nothing. Requiring a real run of
// opaque pixels (not just one stray speck) before counting a row as content skips
// past that noise straight to the water tank/vent
const ALPHA_CUTOFF = 20;
const MIN_OPAQUE_RUN = 20; // a noise speck never spans this many consecutive px
let minY = height;
for (let y = 0; y < height && minY === height; y++) {
  let run = 0;
  for (let x = 0; x < width; x++) {
    if (data[(y * width + x) * channels + 3] > ALPHA_CUTOFF) {
      run++;
      if (run >= MIN_OPAQUE_RUN) {
        minY = y;
        break;
      }
    } else {
      run = 0;
    }
  }
}

await sharp(data, { raw: { width, height, channels } })
  .extract({ left: 0, top: minY, width, height: height - minY })
  .png()
  .toFile(dest);

const finalMeta = await sharp(dest).metadata();
console.log(
  `wrote ${theme}/dist/roof.png: ${finalMeta.width}x${finalMeta.height}`,
);
