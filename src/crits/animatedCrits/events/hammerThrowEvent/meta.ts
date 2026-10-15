import type { EventMeta } from "../../eventMeta";

// the rare "Hammer Throw" event: the wisp whirls round the clicked floor's
// button, then is flung into the screen's edge, bursting coins back across
// the screen into the total
export default {
  label: "Hammer Throw",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    whirlMs: 1_100, // whirling ever faster before it's let go
    holdMs: 450, // the coins hanging after it hits
    mergeMs: 500,
  },
} as const satisfies EventMeta;
