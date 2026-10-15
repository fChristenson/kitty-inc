import type { EventMeta } from "../../eventMeta";

// laundry wisps drift down onto the workers
export default {
  label: "Clothesline",
  style: "wisp",
  reward: "worker tiers",
  chance: 0.01,
  values: {
    stringMs: 350, // the line strung
    gapsMs: [280, 120] as [number, number], // between unpinnings, quickening
    fallMs: 450, // each drift down
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
