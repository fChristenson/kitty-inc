import { processCritIcon } from "../../lib/process-crit-icon.mjs";

// a wide tolerance also clears the sticker's pale rim on the cream backdrop
await processCritIcon("mossMaiden", {
  backgroundColor: [250, 242, 229],
  backgroundColorTolerance: 150,
  dropWhiteHalo: true,
  copyToAssetDirectories: true,
});
