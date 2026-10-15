import type { EventMeta } from "../../eventMeta";

// bolts hammer an anvil wisp, sparks forge the bars
export default {
  label: "Blacksmith",
  style: "lightning",
  reward: "crit tiers",
  chance: 0.01,
  values: {
    warmMs: 260,
    blowsMs: [320, 170] as [number, number], // between blows, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
