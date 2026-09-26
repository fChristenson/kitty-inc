import { processCritIcon } from "../../lib/process-crit-icon.mjs";

// the gap between her arm and blazer is walled in
await processCritIcon("spadeTailSass", {
  backgroundSeeds: [[734, 700]],
  copyToAssetDirectories: true,
});
