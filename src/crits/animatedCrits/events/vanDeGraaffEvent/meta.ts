import type { EventMeta } from "../../eventMeta";

// a charged dome throws bolts onto empty spots
export default {
  label: "Van de Graaff",
  style: "lightning",
  reward: "hires",
  chance: 0.01,
  values: {
    chargeMs: 600, // the dome charging
    gapsMs: [220, 110] as [number, number], // between bolts, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
