import type { EventMeta } from "../../eventMeta";

// the screen falls up and drops back
export default {
  label: "Gravity Flip",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    fallMs: 450, // falling up off the screen
    riseMs: 300,
    hangMs: 250,
    dropMs: 300, // slamming back down
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
