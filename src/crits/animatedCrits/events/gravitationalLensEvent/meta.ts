import type { EventMeta } from "../../eventMeta";

// a heavy wisp lenses a galaxy's light into arcs and an Einstein ring, which
// breaks onto the empty spots
export default {
  label: "Gravitational Lens",
  style: "galaxy",
  reward: "free hires",
  chance: 0.01,
  values: {
    growMs: 250, // the galaxy swirling up
    driftMs: 1000, // the lens drifting in front of the core
    ringMs: 300, // the Einstein ring blazing
    gapMs: 110, // between pieces flung off
    dropMs: 380, // each piece's arc onto its spot
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
