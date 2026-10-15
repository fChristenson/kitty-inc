import type { EventMeta } from "../../eventMeta";

// wisps peek, duck and spring up
export default {
  label: "Peekaboo",
  style: "wisp",
  reward: "hires",
  chance: 0.01,
  values: {
    gapsMs: [240, 130] as [number, number], // between spots, quickening
    peekMs: 440, // each peek, duck and spring
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
