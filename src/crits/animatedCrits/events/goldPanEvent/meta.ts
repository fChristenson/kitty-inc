import type { EventMeta } from "../../eventMeta";

// a pan of cash swirled for nugget wisps
export default {
  label: "Gold Pan",
  style: "mix",
  reward: "hires + cash",
  chance: 0.01,
  values: {
    pourMs: 450, // the pan filling
    gapsMs: [280, 140] as [number, number], // between nuggets, quickening
    flightMs: 400, // each coin's flight into the total
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
