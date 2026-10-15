import type { EventMeta } from "../../eventMeta";

// opposing bands of cash torn into one rip current
export default {
  label: "Riptide",
  style: "money",
  reward: "cash",
  chance: 0.01,
  values: {
    streamMs: 900, // the bands streaming, speeding up
    ripMs: 450, // bands torn into the rip, middle first
    pullMs: 650, // the rip's run up into the total
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
