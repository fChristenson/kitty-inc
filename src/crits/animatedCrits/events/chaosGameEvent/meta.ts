import type { EventMeta } from "../../eventMeta";

// the chaos game draws Sierpinski's triangle in gold dots
export default {
  label: "Chaos Game",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    hopMs: 70, // each of the first, slow hops
    pourMs: 1000, // the rest pouring out
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
