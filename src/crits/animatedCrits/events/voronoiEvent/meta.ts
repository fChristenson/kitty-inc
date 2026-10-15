import type { EventMeta } from "../../eventMeta";

// regions grow from seeds into a Voronoi diagram
export default {
  label: "Voronoi",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    growMs: 1600, // the regions growing till they fill the screen
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
