import type { EventMeta } from "../../eventMeta";

// a forager wisp skitters in flurries and dashes across the screen onto each
// empty spot
export default {
  label: "Lévy Flight",
  style: "wisp",
  reward: "free hires",
  chance: 0.01,
  values: {
    hopMs: 40, // each skittering hop
    dashMs: [320, 200] as [number, number], // each dash to a spot, quickening
    holdMs: 400,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
