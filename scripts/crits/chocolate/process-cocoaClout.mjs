import { processCritIcon } from "../../lib/process-crit-icon.mjs";

// the mug handle's loop shows the background through it
await processCritIcon("cocoaClout", {
  backgroundSeeds: [
    [873, 419],
  ],
  copyToAssetDirectories: true,
});
