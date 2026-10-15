import type { EventMeta } from "../../eventMeta";

// lightning sets a forest of glimmer trees ablaze and the fire front sweeps
// the bars
export default {
  label: "Wildfire",
  style: "experiment",
  reward: "levels",
  chance: 0.01,
  values: {
    growMs: 300, // the forest sprouting
    stepMs: [90, 45] as [number, number], // each generation of the fire, quickening
    levelShare: 0.04, // levels where the front crosses a bar
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
