import fs from "node:fs/promises";
import { processCritIcon } from "../../lib/process-crit-icon.mjs";

await processCritIcon("lordOfMurder");
for (const directory of ["src/assets/crits/attitude", "src/assets/processedCrits/attitude"]) {
  await fs.mkdir(new URL(`../../../${directory}/`, import.meta.url), {
    recursive: true,
  });
  await fs.copyFile(
    new URL("../../../public/crits/attitude/lordOfMurder.png", import.meta.url),
    new URL(`../../../${directory}/lordOfMurder.png`, import.meta.url),
  );
}
