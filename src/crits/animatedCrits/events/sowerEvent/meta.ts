import type { EventMeta } from "../../eventMeta";

// a wisp sows cash and workers sprout
export default {
  label: "Sower",
  style: "mix",
  reward: "hires + cash",
  chance: 0.01,
  values: {
    glideMs: 1_400, // the sower's glide
    holdMs: 500,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
