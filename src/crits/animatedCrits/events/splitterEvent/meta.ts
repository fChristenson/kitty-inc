import type { EventMeta } from "../../eventMeta";

// a bouncing bomb splits into three, each into three more, the last
// generation rippling off
export default {
  label: "Splitter",
  style: "explosion",
  reward: "cash",
  chance: 0.01,
  values: {
    flightMs: [520, 380, 300] as [number, number, number], // per generation
    rippleMs: 45,
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
