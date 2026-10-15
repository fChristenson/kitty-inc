import type { EventMeta } from "../../eventMeta";

// the screen echoes out in ghost copies
export default {
  label: "Echo",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    boomsMs: [280, 110] as [number, number], // between booms, quickening
    collapseMs: 320, // the echoes collapsing back
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
