import type { EventMeta } from "../../eventMeta";

// waves crash on workers
export default {
  label: "Breakers",
  style: "money",
  reward: "worker tiers + cash",
  chance: 0.01,
  values: {
    gapsMs: [300, 160] as [number, number], // between waves, quickening
    waveMs: 520, // each wave's surge up and over
    holdMs: 300,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
