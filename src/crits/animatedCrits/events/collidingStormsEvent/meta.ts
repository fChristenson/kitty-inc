import type { EventMeta } from "../../eventMeta";

// two storm clouds collide
export default {
  label: "Colliding Storms",
  style: "lightning",
  reward: "cash",
  chance: 0.01,
  values: {
    approachMs: 1300, // the clouds rolling in
    riverMs: 420, // the cash river's run into the total
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
