import type { EventMeta } from "../../eventMeta";

// beams converge, then one colossal shot
export default {
  label: "Superlaser",
  style: "beam",
  chance: 0.01,
  values: {
    aimMs: 250, // the aim lasers flickering
    gapMs: 110, // between emitters firing
    chargeMs: 350, // the focus charging once every beam is in
    streamMs: 450, // the cash roaring up the shot
    travelMs: 450, // each coin's trip up it
    holdMs: 300,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
