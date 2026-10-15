import type { EventMeta } from "../../eventMeta";

// a torch beam cuts round the locked floor's lock
export default {
  label: "Cutting Torch",
  style: "beam",
  reward: "unlock",
  chance: 0.01,
  values: {
    flyMs: 300, // the torch flying up
    cutMs: 1_300, // the cut round, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
