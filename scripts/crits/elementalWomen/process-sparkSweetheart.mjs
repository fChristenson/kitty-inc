import path from "node:path";
import { processCritIcon } from "../../lib/process-crit-icon.mjs";
import { unstrokeSticker } from "../../lib/unstroke-sticker.mjs";

// a white-ringed sticker with a black outer stroke; the jumpsuit and stroke
// both run into the bottom edge, so the unstroke stops above it
const unstroked = await unstrokeSticker(
  path.resolve(
    import.meta.dirname,
    "../../../src/assets/crits/elementalWomen/sparkSweetheart.jfif",
  ),
  "sparkSweetheart",
  { maxRow: 780 },
);
await processCritIcon("sparkSweetheart", {
  sourcePath: unstroked,
  dropWhiteHalo: true,
  copyToAssetDirectories: true,
});
