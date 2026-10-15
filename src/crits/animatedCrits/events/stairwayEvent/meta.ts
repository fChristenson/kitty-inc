import type { EventMeta } from "../../eventMeta";

// a stairway of light builds up to the locked floor
export default {
  label: "Stairway",
  style: "beam",
  reward: "an unlock",
  chance: 0.01,
  values: {
    hopsMs: [220, 120] as [number, number], // each step, quickening
    holdMs: 300,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
