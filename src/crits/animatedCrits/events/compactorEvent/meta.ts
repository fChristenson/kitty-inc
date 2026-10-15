import type { EventMeta } from "../../eventMeta";

// closing walls crush a ricocheting ball onto each bar
export default {
  label: "Compactor",
  style: "bounce",
  reward: "levels",
  chance: 0.01,
  values: {
    closesMs: [520, 320] as [number, number], // each bar's walls closing, quickening
    levelShare: 0.03, // per bar
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
