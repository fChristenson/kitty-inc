import type { EventMeta } from "../../eventMeta";

// workers sip cash up out of a pool
export default {
  label: "Drinking Straw",
  style: "mix",
  reward: "worker tiers + cash",
  chance: 0.01,
  values: {
    fillMs: 420, // the pool filling
    sipsMs: [200, 110] as [number, number], // between sips, quickening
    sipMs: 320, // each sip climbing its straw
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
