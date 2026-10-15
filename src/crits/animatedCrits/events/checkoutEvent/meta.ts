import type { EventMeta } from "../../eventMeta";

// a scan beam sweeps each bar
export default {
  label: "Checkout",
  style: "beam",
  reward: "levels + cash",
  chance: 0.01,
  values: {
    hopMs: 160, // the scanner hopping to its next bar
    scansMs: [340, 180] as [number, number], // each sweep, quickening
    levelShare: 0.1, // of each bar's levels
    holdMs: 300,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
