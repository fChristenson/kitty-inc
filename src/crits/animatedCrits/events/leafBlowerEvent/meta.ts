import type { EventMeta } from "../../eventMeta";

// a wisp blows drifts of cash about
export default {
  label: "Leaf Blower",
  style: "mix",
  reward: "cash",
  chance: 0.01,
  values: {
    flyMs: 300, // the wisp flying out
    gapsMs: [300, 150] as [number, number], // between gusts, quickening
    streamMs: 400, // each gust
    travelMs: 700, // each coin's trip on the gust
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
