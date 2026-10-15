import type { EventMeta } from "../../eventMeta";

// a dwarf punches through a galaxy's core, sending a ring of starbirth out
// through it, its knots flung into the total
export default {
  label: "Ring Galaxy",
  style: "galaxy",
  reward: "cash",
  chance: 0.01,
  values: {
    growMs: 250, // the galaxy swirling up
    diveMs: 350, // the dwarf's dive to the core
    ringMs: 900, // the ring rippling out to the rim
    gapMs: 50, // between knots flung off
    liftMs: 380, // each knot's flight into the total
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
