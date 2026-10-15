import type { EventMeta } from "../../eventMeta";

// the screen spins like three slot reels
export default {
  label: "Reels",
  style: "experiment",
  reward: "a surprise reward",
  chance: 0.01,
  values: {
    stopsMs: [700, 1_000, 1_350], // each reel stopping
    levelShare: 0.15, // of each bar's levels, when it pays levels
    holdMs: 700,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
