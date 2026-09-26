import { processCritIcon } from "../../lib/process-crit-icon.mjs";

// a wide tolerance also clears the pale sticker rim around the figure
await processCritIcon("galeGala", {
  backgroundColor: [197, 225, 252],
  backgroundColorTolerance: 80,
  dropWhiteHalo: true,
  copyToAssetDirectories: true,
});
