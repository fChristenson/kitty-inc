import type { EventMeta } from "../../eventMeta";

// the screen launches off and drops back
export default {
  label: "Blast Off",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    shudderMs: 500,
    launchMs: 350,
    awayMs: 250,
    dropMs: 300,
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
