import type { EventMeta } from "../../eventMeta";

// a bomb bursts into bomblets that blow up on the workers
export default {
  label: "Cluster Bomb",
  style: "explosion",
  reward: "worker tiers",
  chance: 0.01,
  values: {
    lobMs: 600, // the bomb's lob up to its burst
    scatterMs: 380, // the first bomblet's fall
    staggerMs: 90, // between bomblets landing
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
