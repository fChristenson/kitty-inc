import type { EventMeta } from "../../eventMeta";

// lasers rain down onto the bars
export default {
  label: "Laser Rain",
  style: "beam",
  reward: "levels",
  chance: 0.01,
  values: {
    rainMs: 1300, // the downpour
    levelShare: 0.02, // of a bar's levels, per drop
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
