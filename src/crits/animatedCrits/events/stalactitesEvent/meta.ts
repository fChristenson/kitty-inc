import type { EventMeta } from "../../eventMeta";

// cash drips into stalactites that break off onto the bars
export default {
  label: "Stalactites",
  style: "money",
  reward: "levels + cash",
  chance: 0.01,
  values: {
    growMs: 500, // the stalactites growing
    gapsMs: [260, 120] as [number, number], // between falls, quickening
    fallMs: 300, // each one's fall
    flightMs: 400, // each coin's flight into the total
    levelShare: 0.04, // of the bar's levels, per hit
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
