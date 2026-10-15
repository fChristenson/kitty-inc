import type { EventMeta } from "../../eventMeta";

// a fighter shoots down a boss
export default {
  label: "Boss Fight",
  style: "gunfire",
  reward: "cash",
  chance: 0.01,
  values: {
    enterMs: 400, // the boss and fighter arriving
    fightMs: 1_600, // the fight, ever faster
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
