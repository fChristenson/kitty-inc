import type { EventMeta } from "../../eventMeta";

// a boomerang bomb drops bomblets
export default {
  label: "Bomb Boomerang",
  style: "explosion",
  reward: "worker perma tiers",
  chance: 0.01,
  values: {
    loopMs: 1800,
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
