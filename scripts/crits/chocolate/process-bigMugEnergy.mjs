import { processCritIcon } from "../../lib/process-crit-icon.mjs";

// the mug handle's loop shows the background through it
await processCritIcon("bigMugEnergy", {
  backgroundSeeds: [
    [1022, 437],
  ],
  copyToAssetDirectories: true,
});
