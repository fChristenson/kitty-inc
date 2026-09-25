import fs from "node:fs/promises";
import { processCritIcon } from "../../lib/process-crit-icon.mjs";

await processCritIcon("bubbleButt", {
  sourceExtension: ".png",
  backgroundSeeds: [
    [800, 1000],
    [715, 510],
  ],
});
await fs.mkdir(
  new URL("../../../src/assets/themes/references/dist/crits/attitude/", import.meta.url),
  {
    recursive: true,
  },
);
await fs.copyFile(
  new URL("../../../public/crits/attitude/bubbleButt.png", import.meta.url),
  new URL(
    "../../../src/assets/themes/references/dist/crits/attitude/bubbleButt.png",
    import.meta.url,
  ),
);
