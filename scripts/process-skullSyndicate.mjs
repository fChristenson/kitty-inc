import { processCritIcon } from "./lib/process-crit-icon.mjs";
import { fileURLToPath } from "node:url";

await processCritIcon("skullSyndicate", {
  sourcePath: fileURLToPath(
    new URL("../src/assets/chromeSkulls.jfif", import.meta.url),
  ),
  copyToAssetDirectories: true,
});
