import { processCritIcon } from "../../lib/process-crit-icon.mjs";

// the halo's ring shows the background through it
await processCritIcon("angelFoodAscension", {
  backgroundSeeds: [
    [600, 63],
  ],
  copyToAssetDirectories: true,
});
