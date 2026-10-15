import type { EventMeta } from "../../eventMeta";

// a crawling dune of cash blows its crest onto the bars
export default {
  label: "Dune",
  style: "money",
  reward: "levels and cash",
  chance: 0.01,
  values: {
    crawlMs: 1300, // the dune crawling across
    levelShare: 0.03, // per bar
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
