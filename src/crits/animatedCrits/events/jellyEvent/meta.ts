import type { EventMeta } from "../../eventMeta";

// the screen wobbles like jelly
export default {
  label: "Jelly",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    thumpsMs: [150, 550, 850, 1_080], // each thump from the button
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
