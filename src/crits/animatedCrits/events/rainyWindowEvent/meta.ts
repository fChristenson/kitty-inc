import type { EventMeta } from "../../eventMeta";

// rain drops run down the screen's glass
export default {
  label: "Rainy Window",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    dropsMs: [180, 70] as [number, number], // between splats, quickening
    slideMs: [700, 350] as [number, number], // each run down, quickening
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
