import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { processCritIcon } from "./lib/process-crit-icon.mjs";

await processCritIcon("infernalInterest", {
  sourcePath: fileURLToPath(
    new URL("../src/assets/demoncBuns2.jpg", import.meta.url),
  ),
});
for (const directory of ["src/assets", "src/assets/themes/references/dist"]) {
  await fs.mkdir(new URL(`../${directory}/`, import.meta.url), {
    recursive: true,
  });
  await fs.copyFile(
    new URL("../public/infernalInterest.png", import.meta.url),
    new URL(`../${directory}/infernalInterest.png`, import.meta.url),
  );
}
