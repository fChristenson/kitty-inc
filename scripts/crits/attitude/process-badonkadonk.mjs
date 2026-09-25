import fs from "node:fs/promises";
import { processCritIcon } from "../../lib/process-crit-icon.mjs";

await processCritIcon("badonkadonk");
for (const directory of ["src/assets", "src/assets/themes/references/dist"]) {
  await fs.mkdir(new URL(`../../../${directory}/crits/attitude/`, import.meta.url), {
    recursive: true,
  });
  await fs.copyFile(
    new URL("../../../public/crits/attitude/badonkadonk.png", import.meta.url),
    new URL(`../../../${directory}/crits/attitude/badonkadonk.png`, import.meta.url),
  );
}
