import type { EventMeta } from "../../eventMeta";

// gyroscope rings of wisps spin up and fling into the bars
export default {
  label: "Gyroscope",
  style: "wisp",
  reward: "crit tiers",
  chance: 0.01,
  values: {
    spinMs: 500, // the rings spinning up
    gapsMs: [340, 180] as [number, number], // between flings, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
