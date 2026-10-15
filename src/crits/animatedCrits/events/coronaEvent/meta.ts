import type { EventMeta } from "../../eventMeta";

// an eclipse flares corona beams
export default {
  label: "Corona",
  style: "beam",
  reward: "cash",
  chance: 0.01,
  values: {
    swellMs: 280, // the sun swelling
    eclipseMs: 900, // the moon sliding over it
    ringMs: 220, // the diamond ring
    fireMs: 260, // every beam firing outward
    collapseMs: 380, // the cash collapsing into the total
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
