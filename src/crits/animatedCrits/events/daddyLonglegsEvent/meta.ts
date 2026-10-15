import type { EventMeta } from "../../eventMeta";

// a wisp strides up the screen on legs of light
export default {
  label: "Daddy Longlegs",
  style: "beam",
  reward: "cash",
  chance: 0.01,
  values: {
    walkMs: 1_800, // the walk
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
