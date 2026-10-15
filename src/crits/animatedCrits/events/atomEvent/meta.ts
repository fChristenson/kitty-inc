import type { EventMeta } from "../../eventMeta";

// the rare "Atom" event: three electron wisps whirl round a nucleus wisp on
// crossing orbits, ever faster, slinging coins, then collapse into it and it
// splits in a huge blast
export default {
  label: "Atom",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    spinMs: 1_700, // from the orbits growing in to the split
    collapseMs: 400, // the orbits collapsing, at the end of the spin
    holdMs: 500, // after the blast, before the coins sweep in
    mergeMs: 500,
  },
} as const satisfies EventMeta;
