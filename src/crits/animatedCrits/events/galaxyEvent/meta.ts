import type { EventMeta } from "../../eventMeta";

// cash swirls into a spiral galaxy
export default {
  label: "Galaxy",
  style: "money",
  reward: "cash",
  chance: 0.01,
  values: {
    formMs: 600, // the arms forming
    spinMs: 900, // spinning up before it collapses
    flightMs: 450, // each coin's flight into the total
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
