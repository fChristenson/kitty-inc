import type { EventMeta } from "../../eventMeta";

// a cord of light erupts in a rolling wall of blasts
export default {
  label: "Detcord",
  style: "explosion",
  reward: "cash",
  chance: 0.01,
  values: {
    layMs: 700, // the cord laid
    burnMs: 1_000, // the spark burning back, speeding up
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
