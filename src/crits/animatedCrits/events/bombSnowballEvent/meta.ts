import type { EventMeta } from "../../eventMeta";

// a snowball of bombs blows them onto the spots
export default {
  label: "Bomb Snowball",
  style: "explosion",
  reward: "free hires",
  chance: 0.01,
  values: {
    rollMs: 1000,
    shudderMs: 260,
    flyMs: 320,
    staggerMs: 90, // between landings
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
