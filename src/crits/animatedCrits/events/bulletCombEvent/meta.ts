import type { EventMeta } from "../../eventMeta";

// a comb of bullets per bar
export default {
  label: "Bullet Comb",
  style: "gunfire",
  reward: "levels",
  chance: 0.01,
  values: {
    combsMs: [440, 300] as [number, number], // each comb, quickening
    levelShare: 0.08, // of each bar's levels
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
