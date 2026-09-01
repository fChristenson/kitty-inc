import sharp from "sharp";
import path from "node:path";
import fs from "node:fs/promises";

// raw src/assets/coinSprites.jfif (AI-generated: one coin sprite sheet, plain
// near-white background, 6 poses spinning through one full rotation spaced evenly
// across a single row) gets chroma-keyed to transparent and re-composited into a
// uniform-cell grid — same technique as process-cat-sprites.mjs, except each frame
// is vertically centered in its cell (a spinning coin has no shared "ground line"
// to bottom-align to, unlike the walking cats). Writes to
// src/assets/themes/references/dist/sprites/coinSpin.png; never overwrites the raw source.

const FRAME_COUNT = 6;
const PADDING = 8; // px of breathing room kept around each pose inside its cell
const WHITE_LO = 200;
const WHITE_HI = 244;
const FLOOD_LO = 150;

const assets = path.resolve(import.meta.dirname, "..", "src", "assets");
const outDir = path.join(assets, "themes", "references", "dist", "sprites");
const srcFile = path.join(assets, "coinSprites.jfif");
const destFile = path.join(outDir, "coinSpin.png");

const { data, info } = await sharp(srcFile)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;

function whitenessAt(x, y) {
  const i = (y * width + x) * channels;
  return Math.min(data[i], data[i + 1], data[i + 2]);
}

// flood-fill (BFS, 4-connected) starting only from the image border, same
// connectivity-based chroma key process-cat-sprites.mjs uses — a real dark outline
// pixel is always way below FLOOD_LO, so white fully enclosed inside a pose (e.g.
// the coin's own glossy highlight) is never reached and never stripped
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

function colHasContent(x) {
  for (let y = 0; y < height; y++) {
    if (data[(y * width + x) * channels + 3] > 10) return true;
  }
  return false;
}

// find runs of columns with any non-transparent pixel
const rawRuns = [];
let start = -1;
for (let x = 0; x < width; x++) {
  const has = colHasContent(x);
  if (has && start === -1) start = x;
  if (!has && start !== -1) {
    rawRuns.push([start, x - 1]);
    start = -1;
  }
}
if (start !== -1) rawRuns.push([start, width - 1]);

// merge tiny (<=5px) stray runs — anti-aliasing remnants, not a real pose — into
// whichever real neighboring run is closest
const runs = [];
for (const run of rawRuns) {
  const runWidth = run[1] - run[0] + 1;
  if (runWidth > 5 || runs.length === 0) {
    runs.push(run);
    continue;
  }
  const prev = runs[runs.length - 1];
  const distToPrev = run[0] - prev[1];
  const next = rawRuns[rawRuns.indexOf(run) + 1];
  const distToNext = next ? next[0] - run[1] : Infinity;
  if (distToPrev <= distToNext) prev[1] = run[1];
  else next[0] = run[0];
}

if (runs.length !== FRAME_COUNT) {
  throw new Error(
    `${path.basename(srcFile)}: expected ${FRAME_COUNT} poses, found ${runs.length}: ${JSON.stringify(runs)}`,
  );
}

// tight bounding box (x from the run, y from actual content) per pose
const boxes = runs.map(([x0, x1]) => {
  let y0 = height,
    y1 = -1;
  for (let x = x0; x <= x1; x++) {
    for (let y = 0; y < height; y++) {
      if (data[(y * width + x) * channels + 3] > 10) {
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  return { x0, x1, y0, y1, w: x1 - x0 + 1, h: y1 - y0 + 1 };
});

const cellW = Math.max(...boxes.map((b) => b.w)) + PADDING * 2;
const cellH = Math.max(...boxes.map((b) => b.h)) + PADDING * 2;

// build each cell separately (crop pose -> pad into a transparent cellW x cellH
// canvas, centered both horizontally and vertically — a spinning coin has no
// shared ground line, unlike the walking cats), then lay all cells out left to
// right into the final sheet
const cellBuffers = await Promise.all(
  boxes.map(async (b) => {
    const cropped = await sharp(data, { raw: { width, height, channels } })
      .extract({ left: b.x0, top: b.y0, width: b.w, height: b.h })
      .png()
      .toBuffer();
    return sharp({
      create: {
        width: cellW,
        height: cellH,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([
        {
          input: cropped,
          left: Math.round((cellW - b.w) / 2),
          top: Math.round((cellH - b.h) / 2),
        },
      ])
      .png()
      .toBuffer();
  }),
);

await fs.mkdir(outDir, { recursive: true });
await sharp({
  create: {
    width: cellW * FRAME_COUNT,
    height: cellH,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  },
})
  .composite(
    cellBuffers.map((buf, i) => ({ input: buf, left: cellW * i, top: 0 })),
  )
  .png()
  .toFile(destFile);

console.log(
  `${path.relative(assets, srcFile)} -> ${path.relative(assets, destFile)}: ${FRAME_COUNT} frames, cell ${cellW}x${cellH}`,
);
