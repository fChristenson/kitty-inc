import { processCritIcon } from "../../lib/process-crit-icon.mjs";

// the whiskers break the face outline, so the white moustache needs shielding
await processCritIcon("pinstripePension", {
  protectedRects: [{ left: 505, top: 178, right: 690, bottom: 258 }],
  copyToAssetDirectories: true,
});
