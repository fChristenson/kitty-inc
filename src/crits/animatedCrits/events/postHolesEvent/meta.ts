import type { EventMeta } from "../../eventMeta";

// drills dive onto the empty spots and grind down through the floor, a new
// worker springing up out of each hole
export default {
  label: "Post Holes",
  style: "drill",
  reward: "free hires",
  chance: 0.01,
  values: {
    approachMs: 220, // each drill's dive
    stallMs: 350, // stalled grinding on the bite
    boreMs: 1100, // boring through shove by shove
    staggerMs: 450, // between drills
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
