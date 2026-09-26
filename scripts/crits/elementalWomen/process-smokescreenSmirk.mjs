import { processCritIcon } from "../../lib/process-crit-icon.mjs";

// a wide tolerance also clears the pale sticker rim around the figure
await processCritIcon("smokescreenSmirk", {
  backgroundColor: [202, 209, 221],
  backgroundColorTolerance: 60,
  dropWhiteHalo: true,
  copyToAssetDirectories: true,
});
