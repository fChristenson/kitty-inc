import type { EventMeta } from "../../eventMeta";

// the rare "Slam Dunk" event: the wisp dribbles across the clicked floor,
// leaps and dunks into the total readout, which explodes in coins that merge
// back into it
export default {
  label: "Slam Dunk",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    // the drop in, then each dribble, quicker and quicker
    bounceMs: [200, 190, 160, 135, 115],
    riseMs: 320, // leaping up over the total
    dunkMs: 110, // slamming down into it
    holdMs: 450, // the coins hanging after the dunk
    mergeMs: 500,
  },
} as const satisfies EventMeta;
