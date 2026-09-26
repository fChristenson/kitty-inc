import { processCritIcon } from "../../lib/process-crit-icon.mjs";

// the gap under the two horses' touching noses is walled in by the finish line
await processCritIcon("photoFinish", {
  backgroundSeeds: [[476, 478]],
  copyToAssetDirectories: true,
});
