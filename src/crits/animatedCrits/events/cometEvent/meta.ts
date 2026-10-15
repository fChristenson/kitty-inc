import type { EventMeta } from "../../eventMeta";

// the rare "Comet" event: a big light streaks diagonally down into a worker
// and explodes, each worker in the blast climbing one perma tier
export default {
  label: "Comet",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    streakMs: 500, // the comet coming down from above the screen into its worker
    holdMs: 900, // the explosion, before the screen unfreezes
  },
} as const satisfies EventMeta;
