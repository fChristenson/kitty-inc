import type { EventMeta } from "../../eventMeta";

// the button fizzes glitter, then pops
export default {
  label: "Sparkler",
  style: "experiment",
  chance: 0.01,
  values: {
    burnMs: 1_500, // the sparkler fizzing
    holdMs: 450,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
