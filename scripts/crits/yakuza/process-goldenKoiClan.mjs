import { processCritIcon } from "../../lib/process-crit-icon.mjs";

// the square hole in the coin is walled in by the koi
await processCritIcon("goldenKoiClan", {
  backgroundSeeds: [[610, 403]],
  copyToAssetDirectories: true,
});
