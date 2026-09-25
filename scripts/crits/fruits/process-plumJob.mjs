import { processCritIcon } from "../../lib/process-crit-icon.mjs";

// the gap between the plum and its briefcase arm is background
await processCritIcon("plumJob", {
  backgroundSeeds: [
    [838, 325],
  ],
  copyToAssetDirectories: true,
});
