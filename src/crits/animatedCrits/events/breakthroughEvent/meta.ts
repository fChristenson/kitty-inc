import type { EventMeta } from "../../eventMeta";

// a drill stalls on the clicked bar, then bores through it
export default {
  label: "Breakthrough",
  style: "drill",
  reward: "levels and a crit tier",
  chance: 0.01,
  values: {
    approachMs: 280, // the drill screaming down
    stallMs: 750, // grinding in place against the bar
    boreMs: 1600, // boring through once it gives
    levelShare: 0.05,
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
