import type { EventMeta } from "../../eventMeta";

// a wisp speedboat carves S-turns trailing a V-shaped wake of cash
export default {
  label: "Speedboat",
  style: "mix",
  reward: "cash",
  chance: 0.01,
  values: {
    runMs: 1_500, // carving across, picking up speed
    flightMs: 380, // each wake coin's wash into the total
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
