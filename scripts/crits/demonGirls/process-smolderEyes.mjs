import { processCritIcon } from "../../lib/process-crit-icon.mjs";

// the portrait sits on a white card inside a dark slate frame, so start
// inside the card
await processCritIcon("smolderEyes", {
  sourceRect: { left: 180, top: 32, width: 858, height: 623 },
  copyToAssetDirectories: true,
});
