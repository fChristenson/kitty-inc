import type { EventMeta } from "../../eventMeta";

// the total readout guns down the bars
export default {
  label: "Return Fire",
  style: "gunfire",
  reward: "levels",
  chance: 0.01,
  values: {
    burstsMs: [380, 220] as [number, number], // between bursts, quickening
    shotGapMs: 60,
    volleyGapMs: 200,
    levelShare: 0.015, // per bullet
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
