import type { EventMeta } from "../../eventMeta";

// a wisp dives into a pool and jets out
export default {
  label: "Pool Dive",
  style: "mix",
  reward: "free hires and cash",
  chance: 0.01,
  values: {
    fillMs: 500,
    diveMs: 220,
    jetsMs: [360, 220] as [number, number],
    holdMs: 300,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
