import type { EventMeta } from "../../eventMeta";

// a spring of cash squeezes and lets go
export default {
  label: "Spring Loaded",
  style: "money",
  reward: "cash",
  chance: 0.01,
  values: {
    formMs: 520, // the river coiling into the spring
    jerksMs: [300, 200] as [number, number], // between squeezes, quickening
    launchMs: 520, // the jet up into the total
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
