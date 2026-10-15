import type { EventMeta } from "../../eventMeta";

// wisps race in each other's slipstream past the bars
export default {
  label: "Slipstream",
  style: "wisp",
  reward: "levels",
  chance: 0.01,
  values: {
    raceMs: 450, // the pack lining up
    gapsMs: [280, 140] as [number, number], // between overtakes, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
