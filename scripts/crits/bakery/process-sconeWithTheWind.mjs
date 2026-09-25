import { processCritIcon } from "../../lib/process-crit-icon.mjs";

// a sliver of background is walled in between the scone halves and strawberry
await processCritIcon("sconeWithTheWind", {
  backgroundSeeds: [[819, 426]],
  copyToAssetDirectories: true,
});
