import type { EventMeta } from "../../eventMeta";

// a train drops bomb cars onto empty spots
export default {
  label: "Bomb Train",
  style: "explosion",
  reward: "hires",
  chance: 0.01,
  values: {
    runMs: 1500, // the engine's run
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
