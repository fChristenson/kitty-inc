import type { EventMeta } from "../../eventMeta";

// rings of bombs blow round each worker
export default {
  label: "Ring of Fire",
  style: "explosion",
  reward: "worker perma tiers",
  chance: 0.01,
  values: {
    fuseMs: 250,
    popsMs: [80, 45] as [number, number], // between bombs round a ring, quickening
    coreGapMs: 90, // the last bomb to the worker's blast
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
