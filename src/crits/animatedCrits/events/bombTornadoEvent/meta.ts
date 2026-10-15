import type { EventMeta } from "../../eventMeta";

// a tornado of bombs flings them off
export default {
  label: "Bomb Tornado",
  style: "explosion",
  reward: "cash",
  chance: 0.01,
  values: {
    spinUpMs: 450,
    flingsMs: [130, 50] as [number, number], // between flings, quickening
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
