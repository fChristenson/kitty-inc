import type { EventMeta } from "../../eventMeta";

// bolts hurled like javelins stick in the bars, then discharge
export default {
  label: "Javelin",
  style: "lightning",
  reward: "levels + a crit tier",
  chance: 0.01,
  values: {
    gapsMs: [420, 240] as [number, number], // between throws, quickening
    flyMs: 150, // each javelin's flight
    chargeMs: 320, // crackling before they all discharge
    levelShare: 0.1, // of each bar's levels
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
