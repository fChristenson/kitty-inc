import type { EventMeta } from "../../eventMeta";

// two guns on the screen's sides fire bursts across the bars
export default {
  label: "Akimbo",
  style: "gunfire",
  reward: "crit tiers",
  chance: 0.01,
  values: {
    splitMs: 300, // the guns splitting apart
    movesMs: [220, 120] as [number, number], // each slide to the next bar, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
