import { processCritIcon } from "../../lib/process-crit-icon.mjs";

// one cream-centred fill clears the white ring, grey stroke and cream badge
await processCritIcon("duneDarling", {
  backgroundColor: [251, 224, 170],
  backgroundColorTolerance: 95,
  dropWhiteHalo: true,
  copyToAssetDirectories: true,
});
