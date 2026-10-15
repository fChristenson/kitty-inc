import type { EventMeta } from "../../eventMeta";

// a wisp lure cast on a line of cash
export default {
  label: "Fishing",
  style: "mix",
  chance: 0.01,
  values: {
    castMs: 600, // the cast (and each coin's trip down the line)
    streamMs: 1_100, // the line paying out
    bitesMs: [300, 560], // bites, after it lands
    strikeMs: 300, // whipped up into the total
    holdMs: 300,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
