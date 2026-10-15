import type { EventMeta } from "../../eventMeta";

// a wisp head leads a rippling body of cash
export default {
  label: "Dragon",
  style: "mix",
  chance: 0.01,
  values: {
    flightMs: 1_700, // the head's flight into the total
    bodyMs: 650, // how far behind the head the tail trails
    holdMs: 300,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
