import { processCritIcon } from "../../lib/process-crit-icon.mjs";

// sticker whose white ring touches the subject, so only the halo can go
await processCritIcon("tailSwish", {
  dropWhiteHalo: true,
  copyToAssetDirectories: true,
});
