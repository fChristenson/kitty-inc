import type { EventMeta } from "../../eventMeta";

// a spout wisp fills a bamboo-fountain rocker of light with cash, which tips,
// gushes onto a heap and clacks back
export default {
  label: "Shishi-odoshi",
  style: "mix",
  reward: "cash",
  chance: 0.01,
  values: {
    growMs: 250, // the rocker rising
    pourMs: 1700, // the four fill-tip-clack cycles, quickening
    surgeMs: 300, // the heap lifting off
    liftMs: 320, // each coin's flight into the total
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
