import type { EventMeta } from "../../eventMeta";

// rounds overshoot and snap back
export default {
  label: "Snapback",
  style: "gunfire",
  reward: "free hires",
  chance: 0.01,
  values: {
    shotsMs: [220, 120] as [number, number], // between shots, quickening
    flightMs: [700, 520] as [number, number],
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
