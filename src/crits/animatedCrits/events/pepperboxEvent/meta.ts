import type { EventMeta } from "../../eventMeta";

// a spinning ring of barrels fires onto empty spots
export default {
  label: "Pepperbox",
  style: "gunfire",
  reward: "free hires",
  chance: 0.01,
  values: {
    spinUpMs: 400,
    shotsMs: [220, 110] as [number, number], // between shots, quickening
    volleyGapMs: 200,
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
