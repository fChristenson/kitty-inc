import type { EventMeta } from "../../eventMeta";

// the rare "Break Shot" event: the wisp breaks a rack of pool balls, which
// scatter and then pop into coins for the total
export default {
  label: "Break Shot",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    popMs: 2_200, // the cue's run in and the scatter, before the balls pop
    holdMs: 450, // the coins hanging after the pop
    mergeMs: 500,
  },
} as const satisfies EventMeta;
