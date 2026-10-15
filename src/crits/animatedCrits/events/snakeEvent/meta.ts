import type { EventMeta } from "../../eventMeta";

// the rare "Snake" event: the wisp heads a snake of coins that gobbles wisps
// over the screen, growing, until it bites the big one on the button and
// blows, its coins merging into the total
export default {
  label: "Snake",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    runMs: 1_800, // slithering its whole route, ever faster
    holdMs: 450, // the coins hanging after it blows
    mergeMs: 500,
  },
} as const satisfies EventMeta;
