import type { EventMeta } from "../../eventMeta";

// counting kick-ups to ten
export default {
  label: "Keepy Uppy",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    touchesMs: [200, 280] as [number, number], // each touch, ever higher
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
