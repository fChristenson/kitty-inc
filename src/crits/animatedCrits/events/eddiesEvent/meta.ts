import type { EventMeta } from "../../eventMeta";

// a river sheds swirling eddies of cash past a rock
export default {
  label: "Eddies",
  style: "money",
  reward: "cash",
  chance: 0.01,
  values: {
    shedMs: 200, // between eddies
    riverMs: 1500,
    liftMs: 380, // each eddy whirling up into the total
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
