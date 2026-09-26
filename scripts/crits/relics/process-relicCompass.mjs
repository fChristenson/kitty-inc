import { processCritIcon } from "../../lib/process-crit-icon.mjs";

await processCritIcon("relicCompass", {
  sourceExtension: ".source.png",
  copyToAssetDirectories: true,
});
