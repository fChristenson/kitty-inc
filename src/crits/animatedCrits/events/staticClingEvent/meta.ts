import type { EventMeta } from "../../eventMeta";

// a wisp rubs up static
export default {
  label: "Static Cling",
  style: "lightning",
  reward: "cash",
  chance: 0.01,
  values: {
    chargeMs: 1300, // the rubbing, quickening, then the discharge
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
