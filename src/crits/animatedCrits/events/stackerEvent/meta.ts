import type { EventMeta } from "../../eventMeta";

// rows of wisps stack up like the arcade game
export default {
  label: "Stacker",
  style: "experiment",
  reward: "crit tiers",
  chance: 0.01,
  values: {
    rowsMs: [420, 200] as [number, number], // each row's slide, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
