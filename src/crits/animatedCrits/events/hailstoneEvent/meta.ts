import type { EventMeta } from "../../eventMeta";

// a wisp bounces through a Collatz sequence onto the clicked bar
export default {
  label: "Hailstone",
  style: "experiment",
  reward: "levels",
  chance: 0.01,
  values: {
    stepMs: [130, 60] as [number, number], // each hop, quickening
    levelShare: 0.06,
    holdMs: 400,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
