import type { EventMeta } from "../../eventMeta";

// a swelling wisp careens wall to wall down onto the clicked bar
export default {
  label: "Juggernaut",
  style: "wisp",
  reward: "levels + a crit tier",
  chance: 0.01,
  values: {
    legsMs: [420, 180] as [number, number], // each wall-to-wall leg, quickening
    levelShare: 0.1, // of each bar's levels
    holdMs: 600,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
