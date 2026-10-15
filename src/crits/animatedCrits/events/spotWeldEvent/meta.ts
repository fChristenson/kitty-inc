import type { EventMeta } from "../../eventMeta";

// two beams weld a bar
export default {
  label: "Spot Weld",
  style: "beam",
  reward: "tier + levels",
  chance: 0.01,
  values: {
    aimMs: 240, // the aim lasers flickering
    weldMs: 1_100, // the beams welding in from both ends
    levelShare: 0.04, // of the bar's levels, per quarter welded
    holdMs: 700,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
