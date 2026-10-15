import type { EventMeta } from "../../eventMeta";

// a hunter wisp blows up every second wisp round a ring; the survivor flies
// into the lock
export default {
  label: "Josephus",
  style: "experiment",
  reward: "a free floor",
  chance: 0.01,
  values: {
    growMs: 300, // the ring flaring up
    hopMs: [100, 45] as [number, number], // each hop round the ring, quickening
    flyMs: 380, // the survivor's flight to the lock
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
