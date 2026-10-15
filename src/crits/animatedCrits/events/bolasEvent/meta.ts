import type { EventMeta } from "../../eventMeta";

// two wisps whirl on a rope of cash
export default {
  label: "Bolas",
  style: "mix",
  chance: 0.01,
  values: {
    flightMs: 1_700, // the bolas's flight into the total
    flowMs: 500, // each coin's run along the rope
    holdMs: 300,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
