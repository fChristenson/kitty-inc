import { processCritIcon } from "../../lib/process-crit-icon.mjs";

// cropped inside the cream card; the colour match also clears its ground shadow
await processCritIcon("blossomBashful", {
  sourceRect: { left: 356, top: 26, width: 534, height: 770 },
  backgroundColor: [239, 231, 220],
  backgroundColorTolerance: 85,
  copyToAssetDirectories: true,
});
