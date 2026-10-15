import type { EventMeta } from "../../eventMeta";

// a comet tears into fragments that plunge onto the bars
export default {
  label: "String of Pearls",
  style: "wisp",
  reward: "levels",
  chance: 0.01,
  values: {
    travelMs: 1300, // the comet's whole path over the bars
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
