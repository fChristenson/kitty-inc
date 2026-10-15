import type { EventMeta } from "../../eventMeta";

// a cliff of cash bursts and floods across
export default {
  label: "Dam Burst",
  style: "money",
  chance: 0.01,
  values: {
    fillMs: 1_000, // the heap piling up against the dam
    spreadMs: 220, // the flood front reaching the far side
    floodMs: 620, // each coin's flood across and up into the total
    holdMs: 300,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
