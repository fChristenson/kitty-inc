import type { EventMeta } from "../../eventMeta";

// the screen is hauled down like rubber and snaps back
export default {
  label: "Rubber Sheet",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    diveMs: 220,
    pullMs: 420,
    holdTautMs: 160,
    settleMs: 650,
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
