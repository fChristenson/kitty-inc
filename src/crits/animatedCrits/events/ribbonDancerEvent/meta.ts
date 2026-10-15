import type { EventMeta } from "../../eventMeta";

// a ribbon of cash twirled about
export default {
  label: "Ribbon Dancer",
  style: "mix",
  reward: "cash",
  chance: 0.01,
  values: {
    danceMs: 1600, // the twirl and the whip into the total
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
