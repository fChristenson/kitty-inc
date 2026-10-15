import type { EventMeta } from "../../eventMeta";

// a wisp leads a growing train past the workers into the clicked bar
export default {
  label: "Pied Piper",
  style: "wisp",
  reward: "worker tiers + a crit tier",
  chance: 0.01,
  values: {
    leadMs: 1_500, // the piper's run from the button to the bar
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
