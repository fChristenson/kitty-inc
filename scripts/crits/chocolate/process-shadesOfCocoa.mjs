import { processCritIcon } from "../../lib/process-crit-icon.mjs";

// the mug handle's loop shows the background through it
await processCritIcon("shadesOfCocoa", {
  backgroundSeeds: [
    [964, 452],
  ],
  copyToAssetDirectories: true,
});
