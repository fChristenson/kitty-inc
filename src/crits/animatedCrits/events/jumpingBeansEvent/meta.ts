import type { EventMeta } from "../../eventMeta";

// beans hop higher and higher on the workers
export default {
  label: "Jumping Beans",
  style: "bounce",
  reward: "worker perma tiers",
  chance: 0.01,
  values: {
    staggerMs: 60, // between beans setting off
    hopMs: [180, 250] as [number, number], // each hop, from the first to the towering last
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
