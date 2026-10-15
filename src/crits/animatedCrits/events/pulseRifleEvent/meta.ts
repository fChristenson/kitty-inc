import type { EventMeta } from "../../eventMeta";

// the button charges, then fires pulses
export default {
  label: "Pulse Rifle",
  style: "beam",
  chance: 0.01,
  values: {
    chargeMs: 700, // charging
    gapMs: 170, // between pulses
    boltMs: 220, // each pulse's flight into the total
    slugMs: 130, // the slug of cash each drags
    holdMs: 300,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
