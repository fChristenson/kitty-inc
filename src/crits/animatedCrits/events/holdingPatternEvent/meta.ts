import type { EventMeta } from "../../eventMeta";

// wisp planes circle a holding stack, then land on the bars one by one
export default {
  label: "Holding Pattern",
  style: "wisp",
  reward: "levels",
  chance: 0.01,
  values: {
    circleMs: 520, // circling before the first landing
    landGapMs: 260, // between landings
    approachMs: 320, // each approach
    skidMs: 220, // skidding along the bar
    levelShare: 0.04,
    holdMs: 400,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
