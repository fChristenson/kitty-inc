import type { EventMeta } from "../../eventMeta";

// a jet of cash fills the locked floor
export default {
  label: "Gusher",
  style: "money",
  reward: "cash + an unlock",
  chance: 0.01,
  values: {
    streamMs: 1_000, // the jet gushing
    riseMs: 600, // each coin's trip up and into the tank
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
