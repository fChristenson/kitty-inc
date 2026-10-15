import type { EventMeta } from "../../eventMeta";

// a swinging beam slices the bars
export default {
  label: "Laser Pendulum",
  style: "beam",
  reward: "levels + a crit tier",
  chance: 0.01,
  values: {
    swingMs: 1_500, // swinging, ever wider
    periodsMs: [800, 450] as [number, number], // each swing, quickening
    lockMs: 220, // whipping round onto the clicked bar
    levelShare: 0.05, // of each bar's levels, per slice
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
