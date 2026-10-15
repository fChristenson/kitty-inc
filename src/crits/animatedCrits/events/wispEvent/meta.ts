import type { EventMeta } from "../../eventMeta";

// the rare "Wisp" event: a playful wisp flits between targets in view
// sprinkling glitter: a worker climbs one perma tier, an income bar one crit
// tier, a "Lvl N" label gains free levels
export default {
  label: "Wisp",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    flyMs: 550, // each swoop to the next target, and off the screen
    sprinkleMs: 1_100, // sweeping back and forth over a target, sprinkling it
    holdMs: 400, // after it's gone, before the screen unfreezes
    minStops: 1,
    maxStops: 5,
    levels: 10, // free levels for a sprinkled "Lvl N" label
  },
} as const satisfies EventMeta;
