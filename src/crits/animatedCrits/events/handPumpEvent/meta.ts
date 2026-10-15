import type { EventMeta } from "../../eventMeta";

// a wisp pumps jets of cash onto each bar
export default {
  label: "Hand Pump",
  style: "mix",
  reward: "crit tiers + cash",
  chance: 0.01,
  values: {
    firstMs: 320,
    strokesMs: [360, 220] as [number, number], // between plunges, quickening
    squirtMs: 160,
    gushMs: 400, // the last gusher into the total
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
