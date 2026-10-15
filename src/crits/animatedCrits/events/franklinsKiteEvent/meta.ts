import type { EventMeta } from "../../eventMeta";

// lightning strikes a kite, the charge runs down to the key, which sparks
// onto the bars
export default {
  label: "Franklin's Kite",
  style: "lightning",
  reward: "levels",
  chance: 0.01,
  values: {
    riseMs: 450, // the kite soaring up
    gapMs: [420, 260] as [number, number], // between strikes, quickening
    levelShare: 0.04, // levels per spark
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
