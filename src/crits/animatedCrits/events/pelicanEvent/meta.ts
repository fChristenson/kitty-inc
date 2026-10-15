import type { EventMeta } from "../../eventMeta";

// a pelican scoops cash onto spots
export default {
  label: "Pelican",
  style: "mix",
  reward: "hires + cash",
  chance: 0.01,
  values: {
    fillMs: 320, // the pool filling
    tripsMs: [560, 380] as [number, number], // each scoop and dump, quickening
    gushMs: 180, // each pouch gushing out
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
