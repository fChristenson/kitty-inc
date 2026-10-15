import type { EventMeta } from "../../eventMeta";

// the rare "Helix" event: two wisps twist round each other in a double helix
// from the button up into the total, flinging coins at every crossing, then
// fuse into it and explode
export default {
  label: "Helix",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    riseMs: 1_700, // from the button up into the total, speeding up
    holdMs: 450, // after the blast, before the coins sweep in
    mergeMs: 500,
  },
} as const satisfies EventMeta;
