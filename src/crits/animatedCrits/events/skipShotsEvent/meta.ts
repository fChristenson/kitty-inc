import type { EventMeta } from "../../eventMeta";

// shots skip off the screen's bottom up into the bars
export default {
  label: "Skip Shots",
  style: "gunfire",
  reward: "levels",
  chance: 0.01,
  values: {
    aimMs: 150,
    shotsMs: [200, 100] as [number, number], // between shots, quickening
    volleyGapMs: 180,
    levelShare: 0.01, // per hit
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
