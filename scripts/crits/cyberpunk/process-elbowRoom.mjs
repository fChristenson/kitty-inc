import { fileURLToPath } from "node:url";
import { processCritIcon } from "../../lib/process-crit-icon.mjs";

await processCritIcon("elbowRoom", {
  sourcePath: fileURLToPath(
    new URL("../../../src/assets/crits/cyberpunk/elbowRoom2.jfif", import.meta.url),
  ),
  copyToAssetDirectories: true,
});
