import { processCritIcon } from "../../lib/process-crit-icon.mjs";

// the gaps between the stand's legs are walled in by the coin pile
await processCritIcon("katanaCashflow", {
  backgroundSeeds: [
    [469, 325],
    [787, 323],
  ],
  copyToAssetDirectories: true,
});
