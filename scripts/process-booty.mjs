import sharp from "sharp";
import path from "node:path";

// raw src/assets/chestOfGoldCoins.jfif (AI-generated: a cartoon open treasure
// chest full of gold coins on a solid flat dark-teal background) — same
// "solid flat non-white background" shape as explosion.jfif, so this reuses
// that same global-distance-from-background-color threshold instead of a
// whiteness threshold (no border flood fill needed — the chest's own wood/
// gold/black-outline colors all sit far from this teal). Writes to
// src/assets/booty.png; never overwrites the raw source.
const BG_COLOR = [2, 68, 72];
const DIST_LO = 35; // below this distance from BG_COLOR: fully transparent
const DIST_HI = 80; // above this distance: fully opaque

const assets = path.resolve(import.meta.dirname, "..", "src", "assets");
const src = path.join(assets, "chestOfGoldCoins.jfif");
const dest = path.join(assets, "booty.png");

const { data, info } = await sharp(src)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;

function bgDistanceAt(i) {
  const dr = data[i] - BG_COLOR[0];
  const dg = data[i + 1] - BG_COLOR[1];
  const db = data[i + 2] - BG_COLOR[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const i = (y * width + x) * channels;
    const dist = bgDistanceAt(i);
    const alpha =
      dist <= DIST_LO
        ? 0
        : dist >= DIST_HI
          ? 255
          : Math.round((255 * (dist - DIST_LO)) / (DIST_HI - DIST_LO));
    data[i + 3] = Math.min(data[i + 3], alpha);
  }
}

// tight bounding box of the remaining opaque content, requiring a real run of
// opaque pixels per row/column (not a stray low-alpha noise speck) before
// counting it as content — same fix process-shield.mjs/process-clock.mjs needed
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
  // only ever drawn as a small flash-text backdrop — both a smaller cap AND
  // palette quantization (adaptive indexed color, alpha channel kept) cut the
  // shipped file size drastically with no visible quality loss at actual
  // on-screen size
  .resize(250, 250, { fit: "inside", withoutEnlargement: true })
  .png({ compressionLevel: 9, palette: true })
  .toFile(dest);

const finalMeta = await sharp(dest).metadata();
console.log(
  `wrote ${path.relative(assets, dest)}: ${finalMeta.width}x${finalMeta.height}`,
);
