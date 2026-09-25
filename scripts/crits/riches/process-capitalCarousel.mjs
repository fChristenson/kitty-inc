import { processCritIcon } from "../../lib/process-crit-icon.mjs";

await processCritIcon("capitalCarousel", {
  backgroundSeeds: [
    [502, 427],
    [712, 427],
  ],
  copyToAssetDirectories: true,
});
