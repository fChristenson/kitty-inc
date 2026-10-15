import type { EventMeta } from "../../eventMeta";

// a wisp arrow drawn on a string of cash
export default {
  label: "Bowstring",
  style: "mix",
  chance: 0.01,
  values: {
    stringMs: 450, // the string of cash forming
    drawMs: 750, // drawn back
    flightMs: 300, // the arrow's flight into the total
    flowMs: 500, // each coin's run along the string
    holdMs: 300,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
