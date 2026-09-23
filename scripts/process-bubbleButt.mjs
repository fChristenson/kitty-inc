import fs from "node:fs/promises";
import { processCritIcon } from "./lib/process-crit-icon.mjs";

await processCritIcon("bubbleButt", {
  sourceExtension: ".png",
  backgroundSeeds: [[800, 1000], [715, 510]],
});
await fs.mkdir(new URL("../src/assets/themes/references/dist/", import.meta.url), {
  recursive: true,
});
await fs.copyFile(
  new URL("../public/bubbleButt.png", import.meta.url),
  new URL("../src/assets/themes/references/dist/bubbleButt.png", import.meta.url),
);