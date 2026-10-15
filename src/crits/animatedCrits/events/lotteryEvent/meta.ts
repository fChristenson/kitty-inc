import type { EventMeta } from "../../eventMeta";

// a lottery draw lands balls on the bars
export default {
  label: "Lottery",
  style: "experiment",
  reward: "levels",
  chance: 0.01,
  values: {
    spinMs: 700, // the drum spinning up
    drawsMs: [340, 180] as [number, number], // between draws, quickening
    levelShare: 0.04, // of the bar's levels, per ball
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
