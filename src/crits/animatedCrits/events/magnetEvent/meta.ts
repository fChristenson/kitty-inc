import type { EventMeta } from "../../eventMeta";

// the rare "Magnet" event: a big magnet yanks coins in from all over the
// screen, then flings them into the total, paying the floor's income times
// its floor number once per floor on screen
export default {
  label: "Magnet",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    streamMs: 700, // how long coins keep popping up
    travelMs: 600, // each coin's pull into the magnet
    mergeMs: 500, // the fling into the total
  },
} as const satisfies EventMeta;
