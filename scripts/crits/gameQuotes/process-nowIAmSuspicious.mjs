import { processCritIcon } from "../../lib/process-crit-icon.mjs";

await processCritIcon("nowIAmSuspicious", {
  protectedRects: [
    { left: 270, top: 829, right: 438, bottom: 831 },
    { left: 830, top: 829, right: 895, bottom: 831 },
  ],
});
