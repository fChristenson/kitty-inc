import type { EventMeta } from "../../eventMeta";

// a ring of stars over a galaxy's poles tips down onto its disk, then showers
// onto the clicked bar
export default {
  label: "Polar Ring",
  style: "galaxy",
  reward: "a crit tier",
  chance: 0.01,
  values: {
    growMs: 250, // the galaxy and its ring swirling up
    tipMs: 1100, // the ring tipping over in quickening lurches
    spreadMs: 250, // the ring's stars leaving one after another
    rainMs: 400, // each star's fall onto the bar
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
