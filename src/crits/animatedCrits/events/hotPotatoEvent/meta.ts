import type { EventMeta } from "../../eventMeta";

// a lit bomb hops spot to spot, blowing where workers form
export default {
  label: "Hot Potato",
  style: "explosion",
  reward: "hires",
  chance: 0.01,
  values: {
    hopsMs: [420, 220] as [number, number], // each hop, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
