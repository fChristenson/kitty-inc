import type { EventMeta } from "../../eventMeta";

// the rare "Trickle" event: like Downpour, but the coins bounce on every
// floor in view on their way down to the pool
export default {
  label: "Trickle",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    streamMs: 800, // how long it keeps raining
    travelMs: 1_100, // each drop's fall, bounces and all
    hangMs: 100, // the pool resting after the last drop lands
    mergeMs: 500, // the pool draining into the total
    rewardMultiplier: 2, // on top of the floor's income times its floor number
  },
} as const satisfies EventMeta;
