import type { EventMeta } from "../../eventMeta";

// egg wisps drop onto the spots, rock and hatch
export default {
  label: "Hatchlings",
  style: "wisp",
  reward: "free hires",
  chance: 0.01,
  values: {
    dropGapMs: 70, // between eggs dropping
    rockMs: 300, // rocking before the first hatches
    hatchesMs: [260, 140] as [number, number], // between hatchings, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
