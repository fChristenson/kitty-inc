import type { EventMeta } from "../../eventMeta";

// glitter scattered over the frozen screen, two slabs slamming in from its
// sides like a vice packing it into a column, then a third pressing down on
// the column without letting up till it buckles and crumbles, a wisp flying
// out of the rubble onto each worker, a perma tier each
export default {
  label: "Under Pressure",
  style: "crush",
  reward: "perma tiers",
  chance: 0.01,
  values: {
    firstMs: 200, // from the click till the glitter scatters
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
