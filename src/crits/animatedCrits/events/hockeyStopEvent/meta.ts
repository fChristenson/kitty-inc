import type { EventMeta } from "../../eventMeta";

// a skater hockey-stops at empty spots spraying cash
export default {
  label: "Hockey Stop",
  style: "mix",
  reward: "hires + cash",
  chance: 0.01,
  values: {
    glidesMs: [360, 220] as [number, number], // each glide, quickening
    holdMs: 500,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
