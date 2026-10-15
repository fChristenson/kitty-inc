import type { EventMeta } from "../../eventMeta";

// a pulsar spins twin beams
export default {
  label: "Pulsar",
  style: "beam",
  reward: "cash",
  chance: 0.01,
  values: {
    spinMs: 1_500, // the spin, quickening
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
