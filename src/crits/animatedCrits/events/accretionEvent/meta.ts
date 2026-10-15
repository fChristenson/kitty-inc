import type { EventMeta } from "../../eventMeta";

// a dust disk round a star wisp clumps into planets, which drop onto the
// empty spots
export default {
  label: "Accretion",
  style: "experiment",
  reward: "free hires",
  chance: 0.01,
  values: {
    growMs: 300, // the star flaring and the disk whirling up
    accreteMs: 1300, // the dust clumping into planets
    gapMs: 130, // between planets breaking orbit
    dropMs: 380, // each planet's arc onto its spot
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
