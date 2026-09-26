import { processCritIcon } from "../../lib/process-crit-icon.mjs";

// the source carries a faint white sticker halo
await processCritIcon("flapperFlames", {
  dropWhiteHalo: true,
  copyToAssetDirectories: true,
});
