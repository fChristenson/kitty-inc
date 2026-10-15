import type { EventMeta } from "../../eventMeta";

// an endless scarf of cash out of a hat
export default {
  label: "Magic Trick",
  style: "mix",
  reward: "cash",
  chance: 0.01,
  values: {
    pullMs: 1500, // the whole pull
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
