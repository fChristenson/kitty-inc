import type { EventMeta } from "../../eventMeta";

// rock, paper, scissors, shoot!
export default {
  label: "Rock Paper Scissors",
  style: "experiment",
  reward: "worker tiers",
  chance: 0.01,
  values: {
    beatMs: 260, // each call
    winsMs: [130, 80] as [number, number], // between wins, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
