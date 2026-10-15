import type { EventMeta } from "../../eventMeta";

// a scout's waggle dance sends bees to each empty spot
export default {
  label: "Waggle Dance",
  style: "wisp",
  reward: "free hires",
  chance: 0.01,
  values: {
    runsMs: [150, 80] as [number, number], // each waggle run, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
