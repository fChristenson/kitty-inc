import { fileURLToPath } from "node:url";
import { processCritIcon } from "../../lib/process-crit-icon.mjs";

await processCritIcon("pulseDividend", {
  sourcePath: fileURLToPath(
    new URL("../../../src/assets/crits/cyberpunk/heartware2.jfif", import.meta.url),
  ),
  copyToAssetDirectories: true,
});
