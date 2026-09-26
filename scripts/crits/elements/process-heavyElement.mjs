import fs from "node:fs/promises";
import { processCritIcon } from "../../lib/process-crit-icon.mjs";

await processCritIcon("heavyElement");
for (const directory of [
  "../../../src/assets/crits/elements/",
  "../../../src/assets/processedCrits/elements/",
]) {
  await fs.mkdir(new URL(directory, import.meta.url), { recursive: true });
  await fs.copyFile(
    new URL("../../../public/crits/elements/heavyElement.png", import.meta.url),
    new URL(`${directory}heavyElement.png`, import.meta.url),
  );
}
