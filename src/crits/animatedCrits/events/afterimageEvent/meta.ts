import type { EventMeta } from "../../eventMeta";

// a blitzing wisp leaves afterimages that streak into the clicked bar
export default {
  label: "Afterimage",
  style: "wisp",
  reward: "levels",
  chance: 0.01,
  values: {
    dashMs: 110, // each blitz between stops
    pauseMs: 70, // frozen at a stop
    streakGapMs: 70, // between afterimages streaking home
    streakMs: 220, // each afterimage's streak
    levelShare: 0.03,
    holdMs: 400,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
