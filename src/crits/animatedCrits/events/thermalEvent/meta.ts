import type { EventMeta } from "../../eventMeta";

// the screen seen through a thermal camera
export default {
  label: "Thermal",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    washMs: 250, // washing into the thermal image
    flaresMs: 1_000, // the hot spots flaring, ever faster
    overheatMs: 280, // overheating white and snapping back
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
