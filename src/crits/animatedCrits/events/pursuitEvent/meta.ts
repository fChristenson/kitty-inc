import type { EventMeta } from "../../eventMeta";

// wisps on a polygon's corners chase each other in along pursuit spirals,
// then burst onto the empty spots
export default {
  label: "Pursuit",
  style: "wisp",
  reward: "free hires",
  chance: 0.01,
  values: {
    chaseMs: 1500, // closing in till they meet
    flyMs: 340, // each flight onto its spot
    holdMs: 400,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
