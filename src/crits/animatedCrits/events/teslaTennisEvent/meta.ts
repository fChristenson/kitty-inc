import type { EventMeta } from "../../eventMeta";

// paddles rally a ball with bolts
export default {
  label: "Tesla Tennis",
  style: "lightning",
  reward: "cash",
  chance: 0.01,
  values: {
    shotsMs: [340, 170] as [number, number], // each return, quickening
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
