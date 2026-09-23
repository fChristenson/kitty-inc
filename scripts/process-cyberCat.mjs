import { processCritIcon } from "./lib/process-crit-icon.mjs";

await processCritIcon("cyberCat", {
  sourceRect: { left: 245, top: 0, width: 756, height: 832 },
  copyToAssetDirectories: true,
});
