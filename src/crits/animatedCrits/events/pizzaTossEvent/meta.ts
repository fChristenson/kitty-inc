import type { EventMeta } from "../../eventMeta";

// a wisp tosses a disc of cash onto each bar
export default {
  label: "Pizza Toss",
  style: "mix",
  reward: "crit tiers + cash",
  chance: 0.01,
  values: {
    formMs: 160,
    spinsMs: [300, 160] as [number, number], // each spin before the toss, quickening
    tossMs: 480,
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
