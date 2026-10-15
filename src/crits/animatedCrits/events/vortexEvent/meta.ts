import type { EventMeta } from "../../eventMeta";

// the rare "Vortex" event: like Stream, but the coins pour in from every
// screen edge and swirl into the total
export default {
  label: "Vortex",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    streamMs: 900, // how long coins keep pouring in
    travelMs: 500, // each coin's swirl into the eye
  },
} as const satisfies EventMeta;
