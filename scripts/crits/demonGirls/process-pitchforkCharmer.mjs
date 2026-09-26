import path from "node:path";
import { processCritIcon } from "../../lib/process-crit-icon.mjs";
import { unstrokeSticker } from "../../lib/unstroke-sticker.mjs";

// the source is a white-ringed sticker with a gray outer stroke
const unstroked = await unstrokeSticker(
  path.resolve(
    import.meta.dirname,
    "../../../src/assets/crits/demonGirls/pitchforkCharmer.jfif",
  ),
  "pitchforkCharmer",
);
await processCritIcon("pitchforkCharmer", {
  sourcePath: unstroked,
  copyToAssetDirectories: true,
});
