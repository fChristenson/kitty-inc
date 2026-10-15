import type { EventMeta } from "../../eventMeta";

// a ball ricochets about inside the clicked bar, then smashes out of its top
export default {
  label: "Bar Billiards",
  style: "bounce",
  reward: "levels",
  chance: 0.01,
  values: {
    dropMs: 260, // the ball dropping into the bar
    exitMs: 200, // smashing out of its top
    levelShare: 0.006, // levels per bounce
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
