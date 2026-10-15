import type { EventMeta } from "../../eventMeta";

// sparks race through a web of neurons to the total
export default {
  label: "Neurons",
  style: "lightning",
  reward: "cash",
  chance: 0.01,
  values: {
    growMs: 350, // the web lighting up
    layersMs: [320, 160] as [number, number], // between layers firing, quickening
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
