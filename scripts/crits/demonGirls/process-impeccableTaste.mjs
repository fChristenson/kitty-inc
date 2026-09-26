import { processCritIcon } from "../../lib/process-crit-icon.mjs";

await processCritIcon("impeccableTaste", {
  // the gap between her cheek and raised hand is walled in
  backgroundSeeds: [[703, 286]],
  // the cream trousers run off the bottom edge
  protectedRects: [{ left: 469, top: 826, right: 780, bottom: 831 }],
  copyToAssetDirectories: true,
});
