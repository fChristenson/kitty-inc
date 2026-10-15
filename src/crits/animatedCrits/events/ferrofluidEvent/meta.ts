import type { EventMeta } from "../../eventMeta";

// a pool of cash bristles into spikes that stab up into the bars
export default {
  label: "Ferrofluid",
  style: "money",
  reward: "levels + cash",
  chance: 0.01,
  values: {
    pourMs: 350, // the button gushing out the pool
    gapsMs: [260, 160] as [number, number], // between spikes, quickening
    stabMs: 200, // each spike shooting up into its bar
    slumpMs: 180, // the spikes slumping back into the pool
    flightMs: 380, // each coin's surge into the total
    levelShare: 0.1, // of each bar's levels
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
