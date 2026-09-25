import { fileURLToPath } from "node:url";
import { processCritIcon } from "../../lib/process-crit-icon.mjs";

await processCritIcon("chromeChassis", {
  sourcePath: fileURLToPath(
    new URL("../../../src/assets/crits/cyberpunk/elbowRoom.jfif", import.meta.url),
  ),
  backgroundSeeds: [[500, 480]],
  copyToAssetDirectories: true,
});
