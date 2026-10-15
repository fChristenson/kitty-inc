import type { EventMeta } from "../../eventMeta";

// bolts charge the locked floor till it bursts open
export default {
  label: "Lightning Rod",
  style: "lightning",
  reward: "an unlock",
  chance: 0.01,
  values: {
    gapsMs: [320, 140] as [number, number], // between strikes, quickening
    finalGapMs: 300, // the last strike to the colossal bolt
    holdMs: 400,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
