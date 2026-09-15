import sharp from "sharp";
import path from "node:path";
import { keepLargestOpaqueComponent } from "./lib/keep-largest-component.mjs";

// "Union Boss" crit's own backdrop icon: same idea as process-intern.mjs, but
// crops the ALREADY-processed manager walk sprite sheet's own frame 0 instead
// (the exact frame floors/worker.ts's own getManagerIconUrl crops at runtime
// for hud/upgradeMenu's "hire manager" icon).
const FRAME_COUNT = 5;
const TURN_FRAME_INDEX = 0;
// see process-intern.mjs's own comment — same baked-in noisy ground patch
// right under the feet, same chroma-key-by-blue-channel fix (a row cutoff
// alone either chops the feet or lets the patch bleed through, since the
// patch sits right under/against the feet)
const SHADOW_FILTER_Y_FRACTION = 260 / 323;
const SHADOW_BLUE_CUTOFF = 15;
const SHADOW_BLACK_RG_CUTOFF = 15;

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
const src = path.join(distSprites, "managerWalk.png");
const assets = path.resolve(import.meta.dirname, "..", "src", "assets");
const dest = path.join(assets, "unionBoss.png");

const sheet = sharp(src);
const { width: sheetW, height: sheetH } = await sheet.metadata();
const frameW = Math.floor(sheetW / FRAME_COUNT);
const frameX = TURN_FRAME_INDEX * frameW;

const { data, info } = await sheet
  .extract({ left: frameX, top: 0, width: frameW, height: sheetH })
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;

const shadowFilterYStart = Math.floor(sheetH * SHADOW_FILTER_Y_FRACTION);
for (let y = shadowFilterYStart; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const i = (y * width + x) * channels;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (
      b < SHADOW_BLUE_CUTOFF &&
      !(r < SHADOW_BLACK_RG_CUTOFF && g < SHADOW_BLACK_RG_CUTOFF)
    ) {
      data[i + 3] = 0;
    }
  }
}
// drops any disconnected fleck the shadow-patch removal left behind. A high
// alphaCutoff here (not the function's default 20) matters: leftover ground-
// shadow noise right under the paws stays weakly attached to the real paw
// only through a handful of partial-alpha (anti-aliased-looking) pixels, so a
// low cutoff still treats it as "connected" and keeps the whole speckled tail.
// Raising the cutoff means only strongly-opaque pixels can link up the main
// silhouette, severing that weak bridge so the noise tail forms its own much
// smaller component and gets dropped, while real fully-opaque paw pixels are
// unaffected.
const COMPONENT_ALPHA_CUTOFF = 200;
keepLargestOpaqueComponent(
  data,
  width,
  height,
  channels,
  COMPONENT_ALPHA_CUTOFF,
);

// tight bounding box of the frame's own opaque silhouette. By this point the
// shadow patch is already gone (color-filtered above) and any leftover fleck
// was dropped by keepLargestOpaqueComponent, so every remaining opaque pixel
// genuinely belongs to the character — MIN_OPAQUE_RUN=1 (any opaque pixel at
// all) is enough; requiring a wider run here (as every other special-crit
// icon script does, where noise ISN'T already fully cleaned up first) chopped
// the paws' own rounded tips off flat instead of capturing their true extent.
const ALPHA_CUTOFF = 20;
const MIN_OPAQUE_RUN = 1;

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
