import type { EventMeta } from "../../eventMeta";

// a drill bores down through every bar in the stack
export default {
  label: "Core Sample",
  style: "drill",
  reward: "levels",
  chance: 0.01,
  values: {
    approachMs: 240,
    boresMs: [320, 180] as [number, number], // each bar's boring, quickening
    levelShare: 0.03, // per bar
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
