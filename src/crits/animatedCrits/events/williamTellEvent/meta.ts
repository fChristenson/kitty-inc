import type { EventMeta } from "../../eventMeta";

// apples shot off the workers' heads
export default {
  label: "William Tell",
  style: "gunfire",
  reward: "worker perma tiers",
  chance: 0.01,
  values: {
    shotsMs: [380, 220] as [number, number], // between apples, quickening
    aimMs: 180,
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
