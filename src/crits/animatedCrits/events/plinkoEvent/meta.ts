import type { EventMeta } from "../../eventMeta";

// the rare "Plinko" event: wisp balls clatter down a triangle of pegs, each
// hit a coin, and slam into the bottom, spraying coins into the total
export default {
  label: "Plinko",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    // when each ball drops in, ever quicker
    dropAt: [0, 170, 310, 430, 530, 610],
    holdMs: 450, // the coins hanging after the last lands
    mergeMs: 500,
  },
} as const satisfies EventMeta;
