import { processCritIcon } from "../../lib/process-crit-icon.mjs";

await processCritIcon("earlGreyGlamour", {
  backgroundColor: [80, 80, 85],
  dropWhiteHalo: true,
  copyToAssetDirectories: true,
});
