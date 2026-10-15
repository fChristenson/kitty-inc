import type { EventMeta } from "../../eventMeta";

// a wisp revs up and dashes into bars
export default {
  label: "Spin Dash",
  style: "wisp",
  reward: "tiers",
  chance: 0.01,
  values: {
    revsMs: [480, 260] as [number, number], // each rev, shortening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
