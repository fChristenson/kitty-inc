import type { EventMeta } from "../../eventMeta";

// a spark winds a coil of lightning round each bar, then every coil
// discharges in a rattle of strikes along the bars
export default {
  label: "Bolt Binding",
  style: "lightning",
  reward: "levels",
  chance: 0.01,
  values: {
    windMs: 340, // the first bar's coil, quickening
    hopMs: 90, // the spark's hop to the next bar
    fireLagMs: 200, // the pause before every coil discharges
    levelShare: 0.004, // levels per strike
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
