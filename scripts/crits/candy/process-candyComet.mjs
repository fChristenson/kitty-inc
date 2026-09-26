import { processCritIcon } from "../../lib/process-crit-icon.mjs";

// the art sits on a white card inside a thick rounded black frame: start
// inside the frame and clear the corner arcs it leaves behind
await processCritIcon("candyComet", {
  sourceExtension: ".source.png",
  sourceRect: { left: 170, top: 165, width: 2220, height: 2230 },
  dropEdgeComponents: true,
  copyToAssetDirectories: true,
});
