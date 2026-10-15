import type { EventMeta } from "../../eventMeta";

// sparks crack across the bars like ignition
export default {
  label: "Ignition",
  style: "lightning",
  reward: "levels + a crit tier",
  chance: 0.01,
  values: {
    firesMs: [300, 140] as [number, number], // between fires, quickening
    finalGapMs: 300, // before the final ignition
    levelShare: 0.05, // of the bar's levels, per fire
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
