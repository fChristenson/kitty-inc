import fs from "node:fs/promises";
import { processCritIcon } from "../../lib/process-crit-icon.mjs";

await processCritIcon("canNotLie", {
  sourceExtension: ".png",
  backgroundSeeds: [[800, 1000]],
});
await fs.mkdir(
  new URL("../../../src/assets/processedCrits/attitude/", import.meta.url),
  {
    recursive: true,
  },
);
await fs.copyFile(
  new URL("../../../public/crits/attitude/canNotLie.png", import.meta.url),
  new URL(
    "../../../src/assets/processedCrits/attitude/canNotLie.png",
    import.meta.url,
  ),
);
