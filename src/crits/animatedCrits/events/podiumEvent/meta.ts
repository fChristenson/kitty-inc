import type { EventMeta } from "../../eventMeta";

// a bottle wisp is shaken up, pops its cork and whips a spray up the bars
// like champagne
export default {
  label: "Podium",
  style: "spray",
  reward: "levels",
  chance: 0.01,
  values: {
    shakeMs: 450, // the bottle being shaken up
    legMs: 260, // the spray raking each bar
    levelShare: 0.02, // levels per bar soaked
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
