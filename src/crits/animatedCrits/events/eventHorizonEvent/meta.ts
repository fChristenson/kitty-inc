import type { EventMeta } from "../../eventMeta";

// the shards are sucked into the clicked floor's bar
export default {
  label: "Event Horizon",
  style: "shatter",
  reward: "levels + tier",
  chance: 0.01,
  values: {
    knocksMs: [200, 480, 700, 900], // each knock, the last shattering it
    pullMs: 750, // the shards sucked in
    levelShare: 0.06, // of the bar's levels, per knock
    holdMs: 600,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
