import fs from "node:fs/promises";
import { processCritIcon } from "../../lib/process-crit-icon.mjs";

await processCritIcon("madeYouLook", { sourceExtension: ".jpg" });
for (const directory of ["src/assets/crits/attitude", "src/assets/processedCrits/attitude"]) {
  await fs.mkdir(new URL(`../../../${directory}/`, import.meta.url), {
    recursive: true,
  });
  await fs.copyFile(
    new URL("../../../public/crits/attitude/madeYouLook.png", import.meta.url),
    new URL(`../../../${directory}/madeYouLook.png`, import.meta.url),
  );
}
