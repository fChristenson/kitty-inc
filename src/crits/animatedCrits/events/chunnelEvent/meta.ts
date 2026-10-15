import type { EventMeta } from "../../eventMeta";

// two drills bore into the bar's ends and meet in its middle
export default {
  label: "Chunnel",
  style: "drill",
  reward: "levels",
  chance: 0.01,
  values: {
    approachMs: 260,
    stallMs: 550, // stalled on the bite
    boreMs: 1300, // boring to the middle
    levelShare: 0.02, // per shove
    holdMs: 400,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
