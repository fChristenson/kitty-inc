import type { EventMeta } from "../../eventMeta";

// a hose of cash pumps into the clicked bar
export default {
  label: "Fuel Line",
  style: "mix",
  reward: "a crit tier + levels + cash",
  chance: 0.01,
  values: {
    plugMs: 500, // the wisp diving down with the hose
    fillMs: 300, // the hose filling behind it
    pumpGapsMs: [380, 220] as [number, number], // between pumps, quickening
    pumpTravelMs: 260, // each slug's run down the hose
    pulseMs: 140, // each slug's length
    levelShare: 0.1, // of the bar's levels, per pump
    holdMs: 300,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
