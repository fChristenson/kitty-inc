import type { EventMeta } from "../../eventMeta";

// a ring races down a wire weaving over the bars, arcing into each
export default {
  label: "Buzz Wire",
  style: "lightning",
  reward: "levels",
  chance: 0.01,
  values: {
    runMs: 1700, // the ring's run down the wire, speeding up
    levelShare: 0.03, // per arc
    holdMs: 400,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
