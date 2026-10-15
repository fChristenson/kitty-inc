import type { EventMeta } from "../../eventMeta";

// cash smoke forms a genie who flings rivers onto empty spots
export default {
  label: "Genie",
  style: "mix",
  reward: "hires + cash",
  chance: 0.01,
  values: {
    riseMs: 600, // the smoke spiralling up
    flingsMs: [260, 160] as [number, number], // between flings, quickening
    flightMs: 360, // each river's flight
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
