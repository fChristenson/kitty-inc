import type { EventMeta } from "../../eventMeta";

// the rare "Pummel" event: a swarm of wisps slams into the clicked floor's
// income bar from every side, then it slams in an explosion and jumps one
// crit tier
export default {
  label: "Pummel",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    strikeMs: 140, // each wisp's wind-up and dash into the bar
    bounceMs: 150, // bouncing back off it to its spot
    holdMs: 450, // after the finale lands, before the screen unfreezes
  },
} as const satisfies EventMeta;
