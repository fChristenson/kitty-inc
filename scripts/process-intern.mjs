import sharp from "sharp";
import path from "node:path";

// "Intern" crit's own backdrop icon: crops the ALREADY-processed worker walk
// sprite sheet's frame 0 (its plain, untinted, camera-facing neutral pose —
// the exact same frame floors/worker.ts's own getWorkerIconUrl crops at
// runtime for hud/upgradeMenu's "hire worker" icon) down to its tight
// bounding box. No chroma-keying needed here (unlike every other process-*
// script) since the sprite sheet is already clean transparent-background art.
const FRAME_COUNT = 5;
const TURN_FRAME_INDEX = 0;
// the walk-cycle sheet bakes a small, noisy/jaggy reddish ground patch in
// right under the character's feet (visible in-game against the floor art,
// but reads as pixelation/a strange-colored blob once isolated as a large
// standalone icon) — this cutoff keeps the feet themselves (still cream-
// colored through row 300) while dropping the patch, which only starts
// bleeding in at row 300+
const CONTENT_HEIGHT_FRACTION = 300 / 323;

const distSprites = path.resolve(
  import.meta.dirname,
  "..",
  "src",
  "assets",
  "themes",
  "references",
  "dist",
  "sprites",
);
const src = path.join(distSprites, "workerWalk.png");
const assets = path.resolve(import.meta.dirname, "..", "src", "assets");
const dest = path.join(assets, "intern.png");

const sheet = sharp(src);
const { width: sheetW, height: sheetH } = await sheet.metadata();
const frameW = Math.floor(sheetW / FRAME_COUNT);
const frameX = TURN_FRAME_INDEX * frameW;
const contentH = Math.floor(sheetH * CONTENT_HEIGHT_FRACTION);

const { data, info } = await sheet
  .extract({ left: frameX, top: 0, width: frameW, height: contentH })
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;

// tight bounding box of the frame's own opaque silhouette, requiring a real
// run of opaque pixels (not a stray low-alpha noise speck) — same fix every
// other special-crit icon script needed
const ALPHA_CUTOFF = 20;
const MIN_OPAQUE_RUN = 10;

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

const croppedW = maxX - minX + 1;
const croppedH = maxY - minY + 1;

await sharp(data, { raw: { width, height, channels } })
  .extract({ left: minX, top: minY, width: croppedW, height: croppedH })
  // only ever drawn as a small flash-text backdrop — small cap + palette
  // quantization keeps this in line with the other special-crit icons
  .resize(250, 250, { fit: "inside", withoutEnlargement: true })
  .png({ compressionLevel: 9, palette: true })
  .toFile(dest);

const finalMeta = await sharp(dest).metadata();
console.log(
  `wrote ${path.relative(assets, dest)}: ${finalMeta.width}x${finalMeta.height}`,
);
