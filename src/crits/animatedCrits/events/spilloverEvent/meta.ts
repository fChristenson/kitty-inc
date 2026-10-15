import type { EventMeta } from "../../eventMeta";

// the rare "Spillover" event: the button pours coins into the income bar
// until it brims over and spills into the total; pays the full bar plus
// bonusPayouts more, and restarts the bar
export default {
  label: "Spillover",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    fillMs: 1_000, // the button filling the bar
    spillMs: 800, // the overflow spilling into the total
    bonusPayouts: 2,
  },
} as const satisfies EventMeta;
