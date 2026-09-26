import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { processCritIcon } from "../../lib/process-crit-icon.mjs";

await processCritIcon("nucleusDividend", {
  sourcePath: fileURLToPath(
    new URL("../../../src/assets/crits/elements/nucleus.jfif", import.meta.url),
  ),
});
for (const directory of [
  "../../../src/assets/crits/elements/",
  "../../../src/assets/processedCrits/elements/",
]) {
  await fs.mkdir(new URL(directory, import.meta.url), { recursive: true });
  await fs.copyFile(
    new URL("../../../public/crits/elements/nucleusDividend.png", import.meta.url),
    new URL(`${directory}nucleusDividend.png`, import.meta.url),
  );
}
