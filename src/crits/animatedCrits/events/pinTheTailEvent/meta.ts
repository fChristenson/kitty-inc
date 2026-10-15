import type { EventMeta } from "../../eventMeta";

// a dizzy wisp pins the bars
export default {
  label: "Pin the Tail",
  style: "experiment",
  reward: "tiers",
  chance: 0.01,
  values: {
    wanderMs: [460, 300] as [number, number], // each stagger, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
