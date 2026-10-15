import type { EventMeta } from "../../eventMeta";

// a wisp blinks from worker to worker
export default {
  label: "Blink",
  style: "wisp",
  reward: "worker tiers",
  chance: 0.01,
  values: {
    staysMs: [340, 170] as [number, number], // each stay, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
