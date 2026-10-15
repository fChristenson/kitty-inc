import type { EventMeta } from "../../eventMeta";

// a gun shoots the ropes holding a weight that drops onto the bar
export default {
  label: "Cut the Rope",
  style: "gunfire",
  reward: "a crit tier",
  chance: 0.01,
  values: {
    shotsMs: [320, 170] as [number, number], // between shots, quickening
    dropMs: 320, // the weight's fall
    holdMs: 400,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
