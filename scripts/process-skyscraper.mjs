import sharp from "sharp";
import path from "node:path";

// raw src/assets/skyscraper.jfif (AI-generated: a blue cartoon skyscraper
// resting on a cream circular platform, on a light blue sky background) gets
// border-flood-fill chroma-keyed to transparent, then cropped to its own tight
// bounding box. Writes to src/assets/skyscraper.png; never overwrites the raw
// source.
//
// this raw is trickier than coin.jfif/merge.jfif/graph.jfif: its cream
// platform sits directly against the sky background with NO darker outline
// between them (a smooth anti-aliased gradient, background ~176-183 min-
// channel straight into platform ~207-251) — a plain brightness-based flood
// fill would leak straight through that gradient and chroma-key the platform
// away too. The sky is distinctly BLUE (B notably higher than R) while the
// platform is warm/cream (R >= G >= B), so flooding also requires a positive
// "blue bias" (B-R) — true for every sky pixel, false for the platform —
// which stops the flood at the platform's own edge even with no whiteness gap
const WHITE_LO = 150;
const WHITE_HI = 178;
const FLOOD_LO = 120;
const BLUE_BIAS_MIN = 30;
// same fix process-merge.mjs needed: background bleed can survive as a low
// but nonzero alpha, high enough to survive the crop's own MIN_OPAQUE_RUN
// check and show up as visible border residue
const NOISE_ALPHA_FLOOR = 100;

const assets = path.resolve(import.meta.dirname, "..", "src", "assets");
const src = path.join(assets, "skyscraper.jfif");
const dest = path.join(assets, "skyscraper.png");

const { data, info } = await sharp(src)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;

function whitenessAt(x, y) {
  const i = (y * width + x) * channels;
  return Math.min(data[i], data[i + 1], data[i + 2]);
}
function blueBiasAt(x, y) {
  const i = (y * width + x) * channels;
  return data[i + 2] - data[i];
}

const isBackground = new Uint8Array(width * height);
const queue = new Int32Array(width * height);
let qHead = 0,
  qTail = 0;
function tryEnqueue(x, y) {
  const idx = y * width + x;
  if (isBackground[idx]) return;
  if (whitenessAt(x, y) <= FLOOD_LO) return;
  if (blueBiasAt(x, y) < BLUE_BIAS_MIN) return;
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
    let alpha =
      whiteness >= WHITE_HI
        ? 0
        : whiteness <= WHITE_LO
          ? 255
          : Math.round(
              255 * (1 - (whiteness - WHITE_LO) / (WHITE_HI - WHITE_LO)),
            );
    if (alpha < NOISE_ALPHA_FLOOR) alpha = 0;
    const i = pixelIdx * channels;
    data[i + 3] = Math.min(data[i + 3], alpha);
  }
}

// tight bounding box of the remaining opaque content, requiring a real run of
// opaque pixels per row/column (not a stray low-alpha noise speck) before counting
// it as content — same fix process-coin.mjs/process-merge.mjs needed
const ALPHA_CUTOFF = 20;
const MIN_OPAQUE_RUN = 20;

function firstOpaqueRow(rows, cols, get) {
  for (let a = 0; a < rows; a++) {
    let run = 0;
    for (let b = 0; b < cols; b++) {
      if (get(a, b) > ALPHA_CUTOFF) {
        run++;
        if (run >= MIN_OPAQUE_RUN) return a;
      } else {
        run = 0;
      }
    }
  }
  return rows;
}

const alphaAt = (y, x) => data[(y * width + x) * channels + 3];
const minY = firstOpaqueRow(height, width, (y, x) => alphaAt(y, x));
const maxY =
  height -
  1 -
  firstOpaqueRow(height, width, (y, x) => alphaAt(height - 1 - y, x));
const minX = firstOpaqueRow(width, height, (x, y) => alphaAt(y, x));
const maxX =
  width -
  1 -
  firstOpaqueRow(width, height, (x, y) => alphaAt(y, width - 1 - x));

await sharp(data, { raw: { width, height, channels } })
  .extract({
    left: minX,
    top: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  })
  // menu icons only ever render at ~28-34px (style.css's .worker-menu__icon) —
  // capping here avoids shipping/decoding/resampling a needlessly huge source
  .resize(160, 160, { fit: "inside", withoutEnlargement: true })
  .png()
  .toFile(dest);

const finalMeta = await sharp(dest).metadata();
console.log(
  `wrote ${path.relative(assets, dest)}: ${finalMeta.width}x${finalMeta.height}`,
);
