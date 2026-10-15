import type { EventMeta } from "../../eventMeta";

// a snake of bombs blows tail to head
export default {
  label: "Bomb Snake",
  style: "explosion",
  reward: "worker tiers",
  chance: 0.01,
  values: {
    slitherMs: 700, // the slither into place
    chainMs: 140, // between blasts up its body
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
