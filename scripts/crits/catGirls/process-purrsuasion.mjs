import { processCritIcon } from "../../lib/process-crit-icon.mjs";

// the cream sleeves run off the bottom edge, so shield them from the
// border-seeded fill there
await processCritIcon("purrsuasion", {
  protectedRects: [
    { left: 379, top: 826, right: 538, bottom: 831 },
    { left: 898, top: 826, right: 984, bottom: 831 },
  ],
  copyToAssetDirectories: true,
});
