import type { EventMeta } from "../../eventMeta";

// guns either side fire bullets into each other over the bars
export default {
  label: "Bullet Clash",
  style: "gunfire",
  reward: "levels",
  chance: 0.01,
  values: {
    firstMs: 250,
    pairsMs: [230, 110] as [number, number], // between pairs of shots, quickening
    volleyGapMs: 180,
    levelShare: 0.02, // per bar
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
