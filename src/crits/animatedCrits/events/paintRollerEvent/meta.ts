import type { EventMeta } from "../../eventMeta";

// a roller wisp paints the bars with cash
export default {
  label: "Paint Roller",
  style: "mix",
  reward: "levels + cash",
  chance: 0.01,
  values: {
    streamMs: 1_000, // the stripe pouring
    travelMs: 1_600, // the roller's trip over every bar
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
