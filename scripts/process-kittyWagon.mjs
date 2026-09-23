import fs from "node:fs/promises";
import { processCritIcon } from "./lib/process-crit-icon.mjs";

await processCritIcon("kittyWagon", { sourceExtension: ".jpg" });
for (const directory of ["src/assets", "src/assets/themes/references/dist"]) {
  await fs.mkdir(new URL(`../${directory}/`, import.meta.url), {
    recursive: true,
  });
  await fs.copyFile(
    new URL("../public/kittyWagon.png", import.meta.url),
    new URL(`../${directory}/kittyWagon.png`, import.meta.url),
  );
}
