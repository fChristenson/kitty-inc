import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { processCritIcon } from "../../lib/process-crit-icon.mjs";

// The sticker sits on a full-bleed white card with rounded corners, and the
// black corners outside the card touch the cushion's own black outline, so
// no component cleanup can separate them. Whiten everything outside the
// card's corner arcs first, then cut out as usual.
const CARD_CORNER_RADIUS = 318;
const source = path.resolve(
  import.meta.dirname,
  "../../../src/assets/crits/goldenAnimals/platinumPaw.source.png",
);
const { data, info } = await sharp(source)
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;
const r = CARD_CORNER_RADIUS;
for (let y = 0; y < height; y++) {
  const dy = y < r ? r - y : y > height - 1 - r ? y - (height - 1 - r) : 0;
  if (!dy) continue;
  for (let x = 0; x < width; x++) {
    const dx = x < r ? r - x : x > width - 1 - r ? x - (width - 1 - r) : 0;
    // a few px inside the arc too, to catch its anti-aliased edge
    if (dx && Math.hypot(dx, dy) > r - 6) {
      data.fill(255, (y * width + x) * channels, (y * width + x + 1) * channels);
    }
  }
}
const uncarded = path.join(os.tmpdir(), "platinumPaw-uncarded.png");
await sharp(data, { raw: { width, height, channels } }).png().toFile(uncarded);
await processCritIcon("platinumPaw", {
  sourcePath: uncarded,
  copyToAssetDirectories: true,
});
