import type { EventMeta } from "../../eventMeta";

// trickles meet at each spot
export default {
  label: "Rivulets",
  style: "money",
  reward: "hires + cash",
  chance: 0.01,
  values: {
    gapsMs: [240, 120] as [number, number], // between pairs, quickening
    runMs: 560, // each trickle's run in from the edge
    holdMs: 300,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
