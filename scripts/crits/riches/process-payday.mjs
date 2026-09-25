import sharp from "sharp";
import path from "node:path";
import { addDropShadow } from "../../lib/synthetic-drop-shadow.mjs";
import { keepLargestOpaqueComponent } from "../../lib/keep-largest-component.mjs";

// raw src/assets/moneySack.jfif (a flat vector-style cream money bag with a
// dark-green "$" on a plain near-white background) gets chroma-keyed to
// transparent, then cropped to its own tight bounding box. Sampled pixel
// values directly first (a throwaway flood-fill script): background
// whiteness (min channel) sits at ~249-254, the palest real content (the
// bag's own cream fill) tops out at ~228 with only a handful of stray
// anti-aliased edge pixels there — a clean gap, same shape as
// process-heaven.mjs's own reasoning, so a plain per-pixel whiteness
// threshold (no border flood fill needed) correctly clears the background
// while leaving the bag's fill fully opaque. Bag+rope+knot are one single
// connected shape, so keepLargestOpaqueComponent discards any leftover
// chroma-key noise. Source had no baked-in shadow, so one is synthesized
// (matching the other special-crit icons). Writes to src/assets/payday.png;
// never overwrites the raw source. Backs the "Payday" crit's flash icon.
const WHITE_LO = 230;
const WHITE_HI = 245;

const assets = path.resolve(import.meta.dirname, "../../..", "src", "assets", "crits", "riches");
const src = path.join(assets, "moneySack.jfif");
const dest = path.join(assets, "payday.png");

const { data, info } = await sharp(src)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;

for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const i = (y * width + x) * channels;
    const whiteness = Math.min(data[i], data[i + 1], data[i + 2]);
    const alpha =
      whiteness >= WHITE_HI
        ? 0
        : whiteness <= WHITE_LO
          ? 255
          : Math.round(
              255 * (1 - (whiteness - WHITE_LO) / (WHITE_HI - WHITE_LO)),
            );
    data[i + 3] = Math.min(data[i + 3], alpha);
  }
}

keepLargestOpaqueComponent(data, width, height, channels);

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

const croppedW = maxX - minX + 1;
const croppedH = maxY - minY + 1;
const cropped = await sharp(data, { raw: { width, height, channels } })
  .extract({ left: minX, top: minY, width: croppedW, height: croppedH })
  .ensureAlpha()
  .raw()
  .toBuffer();

const shadowed = await addDropShadow(cropped, croppedW, croppedH);

await sharp(shadowed.data, {
  raw: { width: shadowed.width, height: shadowed.height, channels: 4 },
})
  .resize(250, 250, { fit: "inside", withoutEnlargement: true })
  .png({ compressionLevel: 9, palette: true })
  .toFile(dest);

const finalMeta = await sharp(dest).metadata();
console.log(
  `wrote ${path.relative(assets, dest)}: ${finalMeta.width}x${finalMeta.height}`,
);
