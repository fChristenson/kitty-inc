import { processCritIcon } from "../../lib/process-crit-icon.mjs";

// the mint ground, white ring and grey shadow are all unsaturated; the lavender skin is not
await processCritIcon("geodeCoquette", {
  backgroundMatch: (r, g, b) =>
    Math.min(r, g, b) >= 120 && Math.max(r, g, b) - Math.min(r, g, b) <= 24,
  dropWhiteHalo: true,
  copyToAssetDirectories: true,
});
