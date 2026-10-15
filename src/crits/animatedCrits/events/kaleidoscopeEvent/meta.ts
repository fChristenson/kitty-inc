import type { EventMeta } from "../../eventMeta";

// the wisp coin events on src/crits/animatedCrits/wispCover, each with its
// chance per crit whose special-crit gateway hit, its timings, then holdMs
// (after the finale, before the coins sweep in) and mergeMs
// src/crits/animatedCrits/events/kaleidoscopeEvent: six wisps bloom a flower,
// petal by petal
export default {
  label: "Kaleidoscope",
  chance: 0.01,
  values: {
    petalMs: [360, 170] as [number, number], // each petal out and back
    holdMs: 450,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
