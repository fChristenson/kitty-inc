import { processCritIcon } from "../../lib/process-crit-icon.mjs";

// a wide tolerance also clears the grey sticker stroke around the white ring;
// the coat runs off the bottom edge unoutlined, so that strip is protected
await processCritIcon("teatimeTease", {
  backgroundColor: [252, 252, 252],
  backgroundColorTolerance: 210,
  protectedRects: [{ left: 440, top: 790, right: 800, bottom: 831 }],
  dropWhiteHalo: true,
  copyToAssetDirectories: true,
});
