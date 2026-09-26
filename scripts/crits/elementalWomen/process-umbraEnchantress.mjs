import { processCritIcon } from "../../lib/process-crit-icon.mjs";

// a wide tolerance also clears the grey sticker shadow around the white ring
await processCritIcon("umbraEnchantress", {
  backgroundColor: [251, 243, 235],
  backgroundColorTolerance: 210,
  dropWhiteHalo: true,
  copyToAssetDirectories: true,
});
