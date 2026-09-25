import { processCritIcon } from "../../lib/process-crit-icon.mjs";

// the gap between the cherry stems is background
await processCritIcon("cherryOnTop", {
  backgroundSeeds: [
    [622, 157],
  ],
  copyToAssetDirectories: true,
});
