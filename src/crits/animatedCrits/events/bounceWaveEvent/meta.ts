import type { EventMeta } from "../../eventMeta";

// a row of balls bounces out of step into waves, then onto the bars
export default {
  label: "Bounce Wave",
  style: "bounce",
  reward: "crit tiers",
  chance: 0.01,
  values: {
    waveMs: 1500, // till every ball lands in step again
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
