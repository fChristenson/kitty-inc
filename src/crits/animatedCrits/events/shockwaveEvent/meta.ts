import type { EventMeta } from "../../eventMeta";

// rings of cash ripple out of the button over the bars
export default {
  label: "Shockwave",
  style: "money",
  reward: "levels + cash",
  chance: 0.01,
  values: {
    gapsMs: [380, 240] as [number, number], // between rings, quickening
    expandMs: 650, // each ring racing out to the edges
    flightMs: 450, // the cash surging back into the total
    levelShare: 0.04, // of each bar's levels, per ring
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
