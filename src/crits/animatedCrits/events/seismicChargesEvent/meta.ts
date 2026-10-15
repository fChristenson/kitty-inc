import type { EventMeta } from "../../eventMeta";

// charges blow in a chain, their shockwaves meet in a colossal blast
export default {
  label: "Seismic Charges",
  style: "explosion",
  reward: "cash",
  chance: 0.01,
  values: {
    fuseMs: 300,
    chainMs: [220, 130] as [number, number], // between charges, quickening
    meetMs: 420, // the last ring rolling out to the meeting point
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
