import type { EventMeta } from "../../eventMeta";

// an invisible tide surges glitter up the screen into the lock
export default {
  label: "Backwash",
  style: "clutter",
  reward: "a free floor",
  chance: 0.01,
  values: {
    rainMs: 450, // the glitter raining down
    surgeMs: 300, // each surge of the tide
    backMs: 150, // each backwash
    gatherMs: 380, // the last surge gathering it under the lock
    holdMs: 400,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
