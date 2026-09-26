import { processCritIcon } from "../../lib/process-crit-icon.mjs";

// the cream cat runs off the bottom edge and is nearly as light as the
// backdrop, so key on the backdrop's exact neutral white instead
await processCritIcon("dragonPearlPact", {
  backgroundColor: [252, 252, 252],
  backgroundColorTolerance: 14,
  copyToAssetDirectories: true,
});
