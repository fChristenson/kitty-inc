import type { EventMeta } from "../../eventMeta";

// a wisp dives through hoops of cash onto the bars
export default {
  label: "Hoop Dive",
  style: "mix",
  reward: "crit tiers and cash",
  chance: 0.01,
  values: {
    legsMs: [520, 320] as [number, number], // each climb and dive, quickening
    formMs: 260, // a hoop springing out of the button
    holdMs: 300,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
