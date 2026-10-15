import type { EventMeta } from "../../eventMeta";

// DVD-screensaver bounces into a corner
export default {
  label: "Screensaver",
  chance: 0.01,
  values: {
    flightMs: 1_900, // from popping up to hitting the corner
    holdMs: 450,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
