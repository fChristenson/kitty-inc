import type { EventMeta } from "../../eventMeta";

// a pool spills a curtain of cash down past every bar
export default {
  label: "Spillway",
  style: "money",
  reward: "levels + cash",
  chance: 0.01,
  values: {
    feedMs: 380, // the river filling the pool
    sheetMs: 900, // the curtain's fall top to bottom
    levelShare: 0.1, // of each bar's levels
    holdMs: 300,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
