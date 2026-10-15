import type { EventMeta } from "../../eventMeta";

// the rare "Bullet Hell" event: the wisp sprays spiral arms of wisps that pop
// into coins at the screen's edges, then blows in a last ring; the coins
// merge into the total
export default {
  label: "Bullet Hell",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    emitMs: 1_300, // spraying, ever faster, before it blows
    holdMs: 450, // the coins hanging after the last pops
    mergeMs: 500,
  },
} as const satisfies EventMeta;
