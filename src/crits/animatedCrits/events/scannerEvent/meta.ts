import type { EventMeta } from "../../eventMeta";

// a scan line reveals cash, then scoops it
export default {
  label: "Scanner",
  style: "beam",
  chance: 0.01,
  values: {
    scanMs: 800, // the line sweeping down
    pauseMs: 120, // at the bottom
    sweepMs: 650, // sweeping back up into the total
    holdMs: 300,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
