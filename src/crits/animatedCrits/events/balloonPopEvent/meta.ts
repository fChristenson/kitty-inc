import type { EventMeta } from "../../eventMeta";

// a dart pops rising balloons
export default {
  label: "Balloon Pop",
  style: "wisp",
  reward: "cash",
  chance: 0.01,
  values: {
    floatMs: 700, // before the first pop
    gapsMs: [260, 120] as [number, number], // between pops, quickening
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
