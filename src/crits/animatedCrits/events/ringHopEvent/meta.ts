import type { EventMeta } from "../../eventMeta";

// a wisp hopping through pairs of rings zigzagging up the screen, faster each
// pass, the last twin shooting it up into the locked floor
export default {
  label: "Ring Hop",
  style: "portal",
  reward: "free floors",
  chance: 0.01,
  values: {
    firstMs: 260, // from the click till the wisp sets off
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
