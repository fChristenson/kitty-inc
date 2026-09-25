import { processCritIcon } from "../../lib/process-crit-icon.mjs";

// same framed card as boilerRoom
await processCritIcon("cogwork", {
  sourceExtension: ".png",
  sourceRect: { left: 45, top: 45, width: 2470, height: 2470 },
  dropEdgeComponents: true,
});
