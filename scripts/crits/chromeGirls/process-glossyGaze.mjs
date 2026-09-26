import path from "node:path";
import { processCritIcon } from "../../lib/process-crit-icon.mjs";
import { unstrokeSticker } from "../../lib/unstroke-sticker.mjs";

// the source is a white-ringed sticker with a black outer stroke
const unstroked = await unstrokeSticker(
  path.resolve(
    import.meta.dirname,
    "../../../src/assets/crits/chromeGirls/glossyGaze.jfif",
  ),
  "glossyGaze",
);
await processCritIcon("glossyGaze", {
  sourcePath: unstroked,
  copyToAssetDirectories: true,
});
