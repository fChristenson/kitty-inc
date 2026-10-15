import type { EventMeta } from "../../eventMeta";

// dynamite in a pool of cash
export default {
  label: "Dynamite Fishing",
  style: "explosion",
  reward: "cash",
  chance: 0.01,
  values: {
    fillMs: 450, // the pool filling
    sticksMs: [200, 120] as [number, number], // between sticks, quickening
    flightMs: 300, // each stick's toss
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
