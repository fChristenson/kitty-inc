import { processCritIcon } from "./lib/process-crit-icon.mjs";

// the source is a rounded card with a black frame at its very edge: crop past
// the frame's straight runs, then drop the corner arcs it leaves behind
await processCritIcon("boilerRoom", {
  sourceExtension: ".png",
  sourceRect: { left: 45, top: 45, width: 2470, height: 2470 },
  dropEdgeComponents: true,
});
