import type { EventMeta } from "../../eventMeta";

// the screen turns into gold halftone dots that peel off as cash
export default {
  label: "Halftone",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    sweepMs: 450, // the ring sweeping the print over the screen
    showMs: 350,
    peelMs: 900, // dots peeling off and swirling into the total
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
