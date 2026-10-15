import type { EventMeta } from "../../eventMeta";

// sluice gates open one by one down a cascade of cash
export default {
  label: "Sluice",
  style: "money",
  reward: "cash",
  chance: 0.01,
  values: {
    streamMs: 1_000, // the cascade pouring
    travelMs: 700, // each coin's trip down the sluice
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
