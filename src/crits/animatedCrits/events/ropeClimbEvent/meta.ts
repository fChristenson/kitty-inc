import type { EventMeta } from "../../eventMeta";

// hand over hand up to the lock
export default {
  label: "Rope Climb",
  style: "wisp",
  reward: "a free floor",
  chance: 0.01,
  values: {
    pullsMs: [190, 110] as [number, number], // each pull, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
