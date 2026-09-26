import path from "node:path";
import { processCritIcon } from "../../lib/process-crit-icon.mjs";
import { unstrokeSticker } from "../../lib/unstroke-sticker.mjs";

// the source is a sticker with a thick black stroke around its white ring
const unstroked = await unstrokeSticker(
  path.resolve(
    import.meta.dirname,
    "../../../src/assets/crits/yakuza/samuraiSpillway.jfif",
  ),
  "samuraiSpillway",
);
await processCritIcon("samuraiSpillway", {
  sourcePath: unstroked,
  // the gap under the blade is walled in by the stand
  backgroundSeeds: [[579, 221]],
  copyToAssetDirectories: true,
});
