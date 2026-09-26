import { processCritIcon } from "../../lib/process-crit-icon.mjs";

// a wide tolerance also clears the thin grey ring around the white badge
await processCritIcon("voltageVow", {
  backgroundColor: [252, 252, 252],
  backgroundColorTolerance: 160,
  dropWhiteHalo: true,
  copyToAssetDirectories: true,
});
