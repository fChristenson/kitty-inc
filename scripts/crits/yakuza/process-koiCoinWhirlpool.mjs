import { processCritIcon } from "../../lib/process-crit-icon.mjs";

// the square hole in the coin is walled in by the koi
await processCritIcon("koiCoinWhirlpool", {
  backgroundSeeds: [[626, 352]],
  copyToAssetDirectories: true,
});
