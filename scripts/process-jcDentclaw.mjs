import { processCritIcon } from "./lib/process-crit-icon.mjs";

// the source arrives as a portrait canvas letterboxed by mid-grey bars
await processCritIcon("jcDentclaw", {
  sourceRect: { left: 279, top: 0, width: 690, height: 832 },
});
