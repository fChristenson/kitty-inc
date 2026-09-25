import { processCritIcon } from "./lib/process-crit-icon.mjs";

// the bagel's hole shows the background through it
await processCritIcon("bagelBoulevard", {
  backgroundSeeds: [[601, 220]],
  copyToAssetDirectories: true,
});
