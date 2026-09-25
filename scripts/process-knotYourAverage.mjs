import { processCritIcon } from "./lib/process-crit-icon.mjs";

// the pretzel's three loops enclose background, not the salt crystals
await processCritIcon("knotYourAverage", {
  backgroundSeeds: [
    [438, 246],
    [820, 244],
    [634, 448],
  ],
  copyToAssetDirectories: true,
});
