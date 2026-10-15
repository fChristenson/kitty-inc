import type { EventMeta } from "../../eventMeta";

// cash drifts pile up on the bars
export default {
  label: "Snowdrift",
  style: "money",
  reward: "levels + cash",
  chance: 0.01,
  values: {
    pileMs: 500, // the drifts piling up
    gapsMs: [260, 120] as [number, number], // between bars, quickening
    flyMs: 300, // each drift blowing onto its bar
    flightMs: 400, // each coin's flight into the total
    levelShare: 0.05, // of the bar's levels, per drift
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
