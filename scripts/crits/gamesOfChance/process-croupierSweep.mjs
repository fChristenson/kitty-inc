import { processCritIcon } from "../../lib/process-crit-icon.mjs";

// the gaps between the rake's tines are walled in by the chip pile
await processCritIcon("croupierSweep", {
  backgroundSeeds: [
    [265, 478],
    [345, 451],
    [423, 425],
    [495, 401],
    [638, 355],
  ],
  copyToAssetDirectories: true,
});
