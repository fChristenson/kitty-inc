import type { EventMeta } from "../../eventMeta";

// two pylons climb
export default {
  label: "Arc Bridge",
  style: "lightning",
  reward: "a free floor",
  chance: 0.01,
  values: {
    stepsMs: [220, 120] as [number, number], // each step up, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
