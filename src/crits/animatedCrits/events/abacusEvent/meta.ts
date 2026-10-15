import type { EventMeta } from "../../eventMeta";

// an abacus counts itself up to 9999 and carries over
export default {
  label: "Abacus",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    countMs: 1500, // counting up, ever faster
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
