import type { EventMeta } from "../../eventMeta";

// a runner dodges crossfire
export default {
  label: "Gauntlet",
  style: "gunfire",
  reward: "cash",
  chance: 0.01,
  values: {
    runMs: 850, // each way across
    shotsMs: [110, 55] as [number, number], // between shots, thickening
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
