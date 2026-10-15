import type { EventMeta } from "../../eventMeta";

// a bomb wisp bounces down the bars splitting in two at every landing,
// 1-2-4-8, the last ones bursting in a cluster of sixteen
export default {
  label: "Doubling Bounce",
  style: "bounce",
  reward: "levels",
  chance: 0.01,
  values: {
    dropMs: 380, // the first bomb's drop onto the top bar
    hopMs: 300, // the first hop, quickening
    levelShare: 0.006, // levels per landing
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
