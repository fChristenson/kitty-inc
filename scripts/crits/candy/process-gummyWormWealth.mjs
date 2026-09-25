import { processCritIcon } from "../../lib/process-crit-icon.mjs";

// the inside of the worm's coil is background
await processCritIcon("gummyWormWealth", {
  backgroundSeeds: [
    [675, 267],
  ],
  copyToAssetDirectories: true,
});
