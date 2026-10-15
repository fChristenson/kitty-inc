import type { EventMeta } from "../../eventMeta";

// the screen spins as slot reels
export default {
  label: "Screen Reels",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    spinMs: 700, // before the first reel stops
    stopGapMs: 220, // between reel stops
    speed: 0.02, // reel spin, screens per ms
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
