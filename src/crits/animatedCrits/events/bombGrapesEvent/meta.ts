import type { EventMeta } from "../../eventMeta";

// bunches of bomb grapes on a vine pop in chains, their hearts dropping onto
// the empty spots
export default {
  label: "Bomb Grapes",
  style: "explosion",
  reward: "free hires",
  chance: 0.01,
  values: {
    growMs: 250, // the vine and bunches dropping in
    popGapMs: 70, // between grapes blowing, quickening by bunch
    bunchGapMs: 60, // after a heart drops, before the next bunch starts
    fallMs: 220, // a heart's drop onto its spot
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
