import type { EventMeta } from "../../eventMeta";

// a dozer shoves heaps of cash off the bars
export default {
  label: "Bulldozer",
  style: "mix",
  reward: "levels + cash",
  chance: 0.01,
  values: {
    pushesMs: [520, 320] as [number, number], // each push, quickening
    flightMs: 400, // each heap's flight into the total
    levelShare: 0.05, // of the bar's levels, per push
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
