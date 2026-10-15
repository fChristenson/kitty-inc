import type { EventMeta } from "../../eventMeta";

// a string of firecrackers pops up the screen to a banger on the locked floor
export default {
  label: "Firecrackers",
  style: "explosion",
  reward: "an unlock",
  chance: 0.01,
  values: {
    runMs: 1_300, // the spark racing up the string
    fuseMs: 350, // the banger fizzing before it blows
    holdMs: 300,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
