import { processCritIcon } from "../../lib/process-crit-icon.mjs";

// a wide tolerance also clears the pale sticker rim around the figure
await processCritIcon("ringletRascal", {
  backgroundColor: [252, 252, 252],
  backgroundColorTolerance: 120,
  dropWhiteHalo: true,
  copyToAssetDirectories: true,
});
