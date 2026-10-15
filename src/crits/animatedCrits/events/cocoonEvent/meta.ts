import type { EventMeta } from "../../eventMeta";

// cash whirls into cocoons that burst into new workers
export default {
  label: "Cocoon",
  style: "money",
  reward: "hires + cash",
  chance: 0.01,
  values: {
    streamMs: 900, // the cash pouring in
    flyMs: 450, // each coin's flight into its cocoon
    gapMs: 220, // between the cocoons bursting
    flingMs: 300, // a burst cocoon's cash flying out
    holdMs: 300,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
