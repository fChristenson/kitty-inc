import type { EventMeta } from "../../eventMeta";

// the rare "Promotion Day" event: lights rise from every worker on the
// clicked floor into its income bar, which climbs one crit tier
export default {
  label: "Promotion Day",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    streamMs: 1_800, // the lights rising into the bar
    holdMs: 900, // after the promotion lands, before the screen unfreezes
  },
} as const satisfies EventMeta;
