import { processCritIcon } from "./lib/process-crit-icon.mjs";

await processCritIcon("platinumRefrain", {
  backgroundSeeds: [
    [560, 260],
    [525, 575],
  ],
  copyToAssetDirectories: true,
});
