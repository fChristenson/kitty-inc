import type { EventMeta } from "../../eventMeta";

// a tree of beams forks up from the button and lashes onto the bars
export default {
  label: "Fractal Tree",
  style: "beam",
  reward: "levels",
  chance: 0.01,
  values: {
    growsMs: [300, 160] as [number, number], // each generation, quickening
    lashMs: 180, // each lash onto a bar
    levelShare: 0.03, // per bar
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
