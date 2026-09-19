import { processCritIcon } from "./lib/process-crit-icon.mjs";

// the heart-shaped bow is a hole, not a white fill
await processCritIcon("windUp", {
  sourceExtension: ".png",
  backgroundSeeds: [[1372, 584]],
});
