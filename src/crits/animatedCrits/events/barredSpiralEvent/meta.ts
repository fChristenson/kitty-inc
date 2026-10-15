import type { EventMeta } from "../../eventMeta";

// a galaxy's bar spins up, flinging the wisps piling at its ends onto the
// bars
export default {
  label: "Barred Spiral",
  style: "galaxy",
  reward: "levels",
  chance: 0.01,
  values: {
    growMs: 250, // the galaxy swirling up
    spinMs: 1500, // the bar spinning up
    flyMs: 320, // each flung wisp's arc onto its bar
    levelShare: 0.012, // levels per hit
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
