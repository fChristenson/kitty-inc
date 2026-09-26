import { processCritIcon } from "../../lib/process-crit-icon.mjs";

// the cream llama is nearly as light as the pale-blue backdrop and its fluffy
// outline leaks, so key on the backdrop's blue tint instead of whiteness
await processCritIcon("lottoLlama", {
  backgroundColor: [235, 240, 251],
  backgroundColorTolerance: 16,
  copyToAssetDirectories: true,
});
