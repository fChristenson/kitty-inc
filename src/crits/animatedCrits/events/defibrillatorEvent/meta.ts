import type { EventMeta } from "../../eventMeta";

// paddles shock the workers
export default {
  label: "Defibrillator",
  style: "lightning",
  reward: "worker tiers",
  chance: 0.01,
  values: {
    moveMs: 160, // the paddles moving to a worker
    chargesMs: [260, 90] as [number, number], // each charge, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
