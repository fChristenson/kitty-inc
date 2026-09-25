import { processCritIcon } from "../../lib/process-crit-icon.mjs";

// the hanging ring on top encloses a hole the border fill can't reach
await processCritIcon("aetherLantern", {
  sourceExtension: ".png",
  backgroundSeeds: [[1362, 385]],
});
