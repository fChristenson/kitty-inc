import { processCritIcon } from "./lib/process-crit-icon.mjs";

// the gaps inside each heart's curls show the background through them
await processCritIcon("palmierParade", {
  backgroundSeeds: [
    [723, 464],
    [1051, 415],
    [181, 400],
    [758, 198],
    [448, 419],
  ],
  copyToAssetDirectories: true,
});
