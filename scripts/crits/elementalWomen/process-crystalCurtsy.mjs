import { processCritIcon } from "../../lib/process-crit-icon.mjs";

// a wide tolerance also clears the grey sticker stroke around the white ring
await processCritIcon("crystalCurtsy", {
  backgroundColor: [252, 241, 223],
  backgroundColorTolerance: 180,
  dropWhiteHalo: true,
  copyToAssetDirectories: true,
});
