import type { EventMeta } from "../../eventMeta";

// two storm wisps trade bolts across the screen through the bars, quicker and
// quicker, then clash mid-screen and fork onto every bar
export default {
  label: "Thunder Duel",
  style: "lightning",
  reward: "levels + crit tier",
  chance: 0.01,
  values: {
    growMs: 250, // the storm wisps swelling in
    levelShare: 0.006, // levels per bolt through a bar
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
