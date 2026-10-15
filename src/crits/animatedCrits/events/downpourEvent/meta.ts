import type { EventMeta } from "../../eventMeta";

// the rare "Downpour" event: coins rain down from above the screen and pool
// along its bottom, then drain into the total
export default {
  label: "Downpour",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    streamMs: 800, // how long it keeps raining
    travelMs: 500, // each drop's fall
    hangMs: 300, // the pool resting after the last drop lands
    mergeMs: 500, // the pool draining into the total
    rewardMultiplier: 2, // on top of the floor's income times its floor number
  },
} as const satisfies EventMeta;
