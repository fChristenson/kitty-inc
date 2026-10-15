import type { EventMeta } from "../../eventMeta";

// two fighters dogfight, misses popping into coins
export default {
  label: "Dogfight",
  style: "gunfire",
  reward: "cash",
  chance: 0.01,
  values: {
    fightMs: 1_900, // the dogfight
    burstsMs: [260, 140] as [number, number], // between bursts, quickening
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
