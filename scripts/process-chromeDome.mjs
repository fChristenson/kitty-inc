import { processCritIcon } from "./lib/process-crit-icon.mjs";
import { fileURLToPath } from "node:url";

await processCritIcon("chromeDome", {
  sourcePath: fileURLToPath(
    new URL("../src/assets/chromeSkull.jfif", import.meta.url),
  ),
  copyToAssetDirectories: true,
});
