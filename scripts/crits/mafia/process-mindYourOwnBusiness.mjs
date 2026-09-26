import { processCritIcon } from "../../lib/process-crit-icon.mjs";

// the art sits inside a thick black frame, so start inside it
await processCritIcon("mindYourOwnBusiness", {
  sourceRect: { left: 42, top: 43, width: 1163, height: 745 },
  copyToAssetDirectories: true,
});
