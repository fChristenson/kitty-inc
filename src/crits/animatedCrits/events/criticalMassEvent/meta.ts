import type { EventMeta } from "../../eventMeta";

// bombs pack into balls that cook off outside in
export default {
  label: "Critical Mass",
  style: "explosion",
  reward: "cash",
  chance: 0.01,
  values: {
    gatherMs: 500, // the first ball packing
    ballsMs: [200, 120] as [number, number], // after a core, till the next ball packs
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
