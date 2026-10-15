import type { EventMeta } from "../../eventMeta";

// the rare "Newton's Cradle" event: five wisps hang like a Newton's cradle
// and clack back and forth, ever faster, each clack spraying coins that then
// sweep into the total
export default {
  label: "Newton's Cradle",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    popMs: 260, // the balls popping in as the left one is drawn back
    firstSwingMs: 220, // the left one let go into the first clack
    swingMs: [300, 130] as [number, number], // each out-and-back, quickening
    flyMs: 500, // the balls flung apart on the last clack
    holdMs: 450, // after the last clack, before the coins sweep in
    mergeMs: 500,
  },
} as const satisfies EventMeta;
