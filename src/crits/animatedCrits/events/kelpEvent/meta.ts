import type { EventMeta } from "../../eventMeta";

// stalks of cash grow, sway, then lean into the total
export default {
  label: "Kelp",
  style: "money",
  chance: 0.01,
  values: {
    growMs: 450, // each stalk growing
    swayMs: 500, // all of them swaying
    leanMs: 300, // leaning over onto the total
    flowMs: 650, // each coin's climb up a stalk
    holdMs: 300,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
