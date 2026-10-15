import type { EventMeta } from "../../eventMeta";

// holes punched through the screen gush cash
export default {
  label: "Swiss Cheese",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    punchMs: [200, 90] as [number, number], // between holes, quickening
    flareGapMs: 200,
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
