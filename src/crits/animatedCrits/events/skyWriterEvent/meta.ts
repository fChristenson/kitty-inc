import type { EventMeta } from "../../eventMeta";

// a wisp skywrites loops of glitter
export default {
  label: "Sky Writer",
  style: "wisp",
  reward: "cash",
  chance: 0.01,
  values: {
    climbMs: 300, // climbing to the start
    writeMs: 1_300, // the loops, ever faster
    flourishMs: 450, // the underline
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
