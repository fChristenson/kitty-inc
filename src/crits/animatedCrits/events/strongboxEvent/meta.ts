import type { EventMeta } from "../../eventMeta";

// a drill grinds into the total readout like a safecracker
export default {
  label: "Strongbox",
  style: "drill",
  reward: "cash",
  chance: 0.01,
  values: {
    approachMs: 300, // the drill screaming up
    stallMs: 650, // grinding in place against the total
    boreMs: 1500, // boring through once it gives
    holdMs: 300,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
