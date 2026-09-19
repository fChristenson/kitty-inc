import { processCritIcon } from "./lib/process-crit-icon.mjs";

// the chain loops back onto the watch, fencing off a pocket of white the
// border-seeded fill can't reach on its own; the source also sits on a faint
// rounded card whose edge survives the key and has to be dropped
await processCritIcon("pocketWatch", {
  sourceExtension: ".png",
  backgroundSeeds: [[1280, 464]],
  dropEdgeComponents: true,
});
