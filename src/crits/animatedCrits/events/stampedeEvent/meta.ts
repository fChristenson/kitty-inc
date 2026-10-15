import type { EventMeta } from "../../eventMeta";

// a herd gallops across, then charges the total
export default {
  label: "Stampede",
  chance: 0.01,
  values: {
    runMs: 900, // each wisp's gallop across
    chargeMs: 320, // each wisp's charge up into the total
    holdMs: 450,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
