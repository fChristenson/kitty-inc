import { processCritIcon } from "../../lib/process-crit-icon.mjs";

// the briefcase handle's loop shows the background through it
await processCritIcon("spreadTheWealth", {
  backgroundSeeds: [
    [858, 456],
  ],
  copyToAssetDirectories: true,
});
