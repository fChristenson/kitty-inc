import type { EventMeta } from "../../eventMeta";

// a bomb banks off the walls into the bars
export default {
  label: "Pinball Bomb",
  style: "explosion",
  reward: "tiers",
  chance: 0.01,
  values: {
    speed: 2.2, // px per ms at first
    speedUp: 1.08, // faster after every leg
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
