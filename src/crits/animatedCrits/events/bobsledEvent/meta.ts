import type { EventMeta } from "../../eventMeta";

// a river races down a bobsled run
export default {
  label: "Bobsled",
  style: "money",
  reward: "cash",
  chance: 0.01,
  values: {
    runMs: [520, 300] as [number, number], // each curve, quickening
    launchMs: 440, // the ramp's launch into the total
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
