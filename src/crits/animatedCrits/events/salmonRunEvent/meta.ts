import type { EventMeta } from "../../eventMeta";

// wisps leap up a river of cash like salmon
export default {
  label: "Salmon Run",
  style: "mix",
  reward: "hires + cash",
  chance: 0.01,
  values: {
    pourMs: 400, // the river pouring
    startsMs: 300, // the first leap
    leapMs: 450, // each leap
    arcMs: 400, // each salmon's arc onto its spot
    flightMs: 400, // each coin's flight into the total
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
