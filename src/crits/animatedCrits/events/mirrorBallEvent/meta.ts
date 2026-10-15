import type { EventMeta } from "../../eventMeta";

// wheeling beams over workers
export default {
  label: "Mirror Ball",
  style: "beam",
  reward: "worker tiers",
  chance: 0.01,
  values: {
    dropMs: 300, // the ball dropping in
    spinMs: 1_500, // the beams wheeling round, speeding up
    holdMs: 400,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
