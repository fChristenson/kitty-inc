import type { EventMeta } from "../../eventMeta";

// a spark races round a clock of twelve bombs, blowing each hour
export default {
  label: "Fuse Clock",
  style: "explosion",
  reward: "cash",
  chance: 0.01,
  values: {
    hoursMs: [200, 70] as [number, number], // each hour, quickening
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
