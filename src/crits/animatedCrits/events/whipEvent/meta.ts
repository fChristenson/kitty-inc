import type { EventMeta } from "../../eventMeta";

// a whip of flowing cash cracks against the bars
export default {
  label: "Whip",
  style: "mix",
  reward: "levels + tier + cash",
  chance: 0.01,
  values: {
    unfurlMs: 300, // the whip pouring out of the button
    cracksMs: [380, 220] as [number, number], // between cracks, quickening
    levelShare: 0.1, // of a bar's levels, per crack
    sweepMs: 280, // the whip's cash setting off for the total
    flightMs: 360, // each coin's flight into the total
    holdMs: 300,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
