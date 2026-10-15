import type { EventMeta } from "../../eventMeta";

// a ball bounces down the bars end to end like a superball down a stairwell
export default {
  label: "Stairwell",
  style: "bounce",
  reward: "levels",
  chance: 0.01,
  values: {
    hopMs: 260, // each bounce, quickening
    levelShare: 0.012, // levels per bounce
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
