import fs from "node:fs/promises";
import { processStickerCritIcon } from "../../lib/process-sticker-crit-icon.mjs";

await processStickerCritIcon("layeredSecurity", { ringSeed: [590, 37] });
for (const directory of [
  "../../../src/assets/crits/cakes/",
  "../../../src/assets/themes/references/dist/crits/cakes/",
]) {
  await fs.mkdir(new URL(directory, import.meta.url), { recursive: true });
  await fs.copyFile(
    new URL("../../../public/crits/cakes/layeredSecurity.png", import.meta.url),
    new URL(`${directory}layeredSecurity.png`, import.meta.url),
  );
}
