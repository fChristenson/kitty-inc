import type { EventMeta } from "../../eventMeta";

// the rare "Fuse" event: a spark races along a fuse from the screen's side to
// the button, which blows up spraying coins across the screen into the total
export default {
  label: "Fuse",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    burnMs: 900, // the spark racing along the fuse
    holdMs: 550, // the coins hanging after the blast
    mergeMs: 500, // the coins sweeping into the total
  },
} as const satisfies EventMeta;
