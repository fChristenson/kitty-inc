import type { EventMeta } from "../../eventMeta";

// chains of charges race to each bar and erupt in a cluster
export default {
  label: "Fault Line",
  style: "explosion",
  reward: "crit tiers",
  chance: 0.01,
  values: {
    chainsMs: [80, 45] as [number, number], // between charges, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
