import type { EventMeta } from "../../eventMeta";

// a trolley on a live wire drops bolts on the bars
export default {
  label: "Trolley",
  style: "lightning",
  reward: "levels",
  chance: 0.01,
  values: {
    runsMs: [550, 320] as [number, number], // each run, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
