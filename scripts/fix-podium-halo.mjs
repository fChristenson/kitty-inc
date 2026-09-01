import sharp from "sharp";
import path from "node:path";

// one-off cleanup: src/assets/podiumSprites.jfif (the raw source) has since been
// deleted, so process-podium-sprites.mjs can no longer be re-run from scratch —
// this instead color-decontaminates the ALREADY-GENERATED src/assets/themes/references/dist/sprites/
// podiumSpeak.png in place, using the same whiteness-based un-blend-from-white
// math added to process-podium-sprites.mjs/process-cat-sprites.mjs, to strip the
// white/gray halo still baked into its existing edge pixels

const assets = path.resolve(import.meta.dirname, "..", "src", "assets");
const file = path.join(
  assets,
  "themes",
  "references",
  "dist",
  "sprites",
  "podiumSpeak.png",
);

const { data, info } = await sharp(file)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;

// only pixels with partial alpha are edge/transition pixels here — fully
// transparent (padding) and fully opaque (real content) pixels are left alone,
// since there's no flood-fill info left to tell opaque halo remnants apart
// from legitimate opaque interior content (collar, glasses) in this baked file
let fixedCount = 0;
for (let p = 0; p < width * height; p++) {
  const i = p * channels;
  const alpha = data[i + 3];
  if (alpha <= 0 || alpha >= 255) continue;
  const whiteness = Math.min(data[i], data[i + 1], data[i + 2]);
  const blend = Math.max(0, Math.min(1, 1 - whiteness / 255));
  if (blend <= 0.02) continue;
  for (let c = 0; c < 3; c++) {
    const observed = data[i + c];
    const decontaminated = (observed - 255 * (1 - blend)) / blend;
    data[i + c] = Math.max(0, Math.min(255, Math.round(decontaminated)));
  }
  fixedCount++;
}

await sharp(data, { raw: { width, height, channels } }).png().toFile(file);

console.log(`${path.basename(file)}: decontaminated ${fixedCount} edge pixels`);
