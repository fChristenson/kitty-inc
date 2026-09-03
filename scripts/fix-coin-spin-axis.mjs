import sharp from "sharp";
import path from "node:path";

// one-off fix: coinSprites.jfif (the raw source process-coin-sprites.mjs reads)
// no longer exists in the workspace, so that script can't be re-run from
// scratch — this instead re-derives each pose's bounding box straight from the
// ALREADY-BUILT dist/coinSpin.png sheet (6 equal-width cells, pose padded +
// centered in each) and rebuilds it with the same "rotate squished/edge poses
// 90° so the spin axis reads as horizontal instead of vertical" fix
// process-coin-sprites.mjs itself now has — see that script's own comment for
// the full reasoning. Safe to delete once/if the raw .jfif is ever restored
// and process-coin-sprites.mjs is re-run for real instead.

const FRAME_COUNT = 6;
const CONTENT_ALPHA_THRESHOLD = 40; // stricter than a raw alpha>0 check — see repo notes on faint chroma-key flecks inflating bounding boxes
const ROTATE_ASPECT_THRESHOLD = 1.15;
// drawCoinBurstFrame (coinBurst/index.ts) scales the WHOLE cell (padding
// included) onto its caller's radius-derived destW/destH box — so the cell's
// own footprint (not just the pose inside it) is what determines the coin's
// apparent on-screen size. Every burst radius constant across the repo
// (floors/coins, coinBurst) was tuned against the ORIGINAL
// sheet's 318x559 cells; keeping that same output footprint here (a first
// run of this script recomputed a tight-content 317x317 cell instead, which
// visibly inflated every on-screen coin — regression fixed by pinning back
// to the original size) means only the pose's rotation inside the cell
// changes, not the scale any existing caller renders it at
const OUTPUT_CELL_W = 318;
const OUTPUT_CELL_H = 559;

const assets = path.resolve(import.meta.dirname, "..", "src", "assets");
const destFile = path.join(
  assets,
  "themes",
  "references",
  "dist",
  "sprites",
  "coinSpin.png",
);

const { data, info } = await sharp(destFile)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;
const cellW = width / FRAME_COUNT;

function alphaAt(x, y) {
  return data[(y * width + x) * channels + 3];
}

const boxes = [];
for (let i = 0; i < FRAME_COUNT; i++) {
  const cellX0 = Math.round(i * cellW);
  const cellX1 = Math.round((i + 1) * cellW) - 1;
  let x0 = cellX1 + 1,
    x1 = cellX0 - 1,
    y0 = height,
    y1 = -1;
  for (let x = cellX0; x <= cellX1; x++) {
    for (let y = 0; y < height; y++) {
      if (alphaAt(x, y) > CONTENT_ALPHA_THRESHOLD) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < x0) throw new Error(`frame ${i}: no content found`);
  boxes.push({ x0, x1, y0, y1, w: x1 - x0 + 1, h: y1 - y0 + 1 });
}

const rotations = boxes.map((b) => b.h > b.w * ROTATE_ASPECT_THRESHOLD);
console.log(
  "per-frame w/h and rotate flag:",
  boxes.map((b, i) => `${b.w}x${b.h}${rotations[i] ? " ROTATE" : ""}`),
);

const newCellW = OUTPUT_CELL_W;
const newCellH = OUTPUT_CELL_H;

const cellBuffers = await Promise.all(
  boxes.map(async (b, i) => {
    let cropped = sharp(data, { raw: { width, height, channels } }).extract({
      left: b.x0,
      top: b.y0,
      width: b.w,
      height: b.h,
    });
    const [poseW, poseH] = rotations[i] ? [b.h, b.w] : [b.w, b.h];
    if (rotations[i]) cropped = cropped.rotate(90);
    const croppedBuffer = await cropped.png().toBuffer();
    return sharp({
      create: {
        width: newCellW,
        height: newCellH,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([
        {
          input: croppedBuffer,
          left: Math.round((newCellW - poseW) / 2),
          top: Math.round((newCellH - poseH) / 2),
        },
      ])
      .png()
      .toBuffer();
  }),
);

await sharp({
  create: {
    width: newCellW * FRAME_COUNT,
    height: newCellH,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  },
})
  .composite(
    cellBuffers.map((buf, i) => ({ input: buf, left: newCellW * i, top: 0 })),
  )
  .png()
  .toFile(destFile);

console.log(
  `${path.relative(assets, destFile)}: rebuilt, cell ${newCellW}x${newCellH}`,
);
