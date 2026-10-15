import type { EventMeta } from "../../eventMeta";

// a whirling ride per worker
export default {
  label: "Tilt-a-Whirl",
  style: "wisp",
  reward: "worker tiers",
  chance: 0.01,
  values: {
    spinsMs: [560, 360] as [number, number], // each whirl, quickening
    hopMs: 150, // the ride's hop to the next worker
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
