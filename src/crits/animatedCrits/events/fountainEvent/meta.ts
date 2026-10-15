import type { EventMeta } from "../../eventMeta";

// the rare "Fountain" event: like Spray, but the button jets the coins up so
// they arc over and rain down across the screen
export default {
  label: "Fountain",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    streamMs: 700, // how long the jet shoots
    travelMs: 700, // each coin's arc up and down
    durationMs: 2000, // jet, the last coin's arc, a short hang, then the merge
    mergeMs: 500,
  },
} as const satisfies EventMeta;
