import type { EventMeta } from "../../eventMeta";

// a live wire thrashes and lashes open the locked floor
export default {
  label: "Live Wire",
  style: "lightning",
  reward: "unlock",
  chance: 0.01,
  values: {
    thrashMs: 1_100, // the wire thrashing
    lashMs: 350, // the last lash into the floor
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
