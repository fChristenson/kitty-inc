import type { EventMeta } from "../../eventMeta";

// a gun circles each bar, a loop of bullets cinching onto it
export default {
  label: "Bullet Lasso",
  style: "gunfire",
  reward: "crit tiers",
  chance: 0.01,
  values: {
    loopsMs: [460, 320] as [number, number], // each loop, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
