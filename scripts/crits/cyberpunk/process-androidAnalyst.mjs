import path from "node:path";
import { processCritIcon } from "../../lib/process-crit-icon.mjs";

// raw art keeps its original name so the processed root copy can't overwrite it
await processCritIcon("androidAnalyst", {
  sourcePath: path.resolve(
    import.meta.dirname,
    "../../../src/assets/crits/cyberpunk/android.png",
  ),
  copyToAssetDirectories: true,
});
