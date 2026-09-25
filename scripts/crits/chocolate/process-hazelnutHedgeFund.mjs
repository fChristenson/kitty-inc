import { processCritIcon } from "../../lib/process-crit-icon.mjs";

// the briefcase handle's loop shows the background through it
await processCritIcon("hazelnutHedgeFund", {
  backgroundSeeds: [
    [326, 464],
  ],
  copyToAssetDirectories: true,
});
