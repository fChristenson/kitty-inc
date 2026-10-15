import type { EventMeta } from "../../eventMeta";

// fog machines fill the screen with gold fog that swallows the bars
export default {
  label: "Fog Machine",
  style: "spray",
  reward: "levels",
  chance: 0.01,
  values: {
    riseMs: 1500, // the fog rising up the screen
    levelShare: 0.05,
    holdMs: 400,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
