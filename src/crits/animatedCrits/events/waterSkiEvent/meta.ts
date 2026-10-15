import type { EventMeta } from "../../eventMeta";

// a boat wisp carves S-bends trailing a wake of cash, a skier jumping it,
// into the total
export default {
  label: "Water Ski",
  style: "mix",
  reward: "cash",
  chance: 0.01,
  values: {
    runMs: 1600, // the boat's run into the total
    letGoMs: 260, // the skier's flight in after it
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
