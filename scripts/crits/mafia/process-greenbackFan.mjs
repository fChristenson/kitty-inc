import { processCritIcon } from "../../lib/process-crit-icon.mjs";

// the cream belly has no outline where the body is cut off at the bottom
await processCritIcon("greenbackFan", {
  protectedRects: [{ left: 428, top: 820, right: 620, bottom: 822 }],
  copyToAssetDirectories: true,
});
