import type { EventMeta } from "../../eventMeta";

// a wisp drinks a river of cash and squirts the workers
export default {
  label: "Water Pistol",
  style: "mix",
  reward: "worker tiers + cash",
  chance: 0.01,
  values: {
    diveMs: 250, // the dive to the bottom
    drinkMs: 450, // the drink
    gapsMs: [220, 120] as [number, number], // between squirts, quickening
    squirtMs: 350, // each squirt's trip to its worker
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
