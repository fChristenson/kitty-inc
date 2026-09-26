import { processCritIcon } from "../../lib/process-crit-icon.mjs";

// a wide tolerance also clears the grey sticker stroke around the white ring
await processCritIcon("hourglassHeiress", {
  backgroundColor: [252, 252, 252],
  backgroundColorTolerance: 180,
  dropWhiteHalo: true,
  copyToAssetDirectories: true,
});
