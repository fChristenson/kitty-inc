import type { EventMeta } from "../../eventMeta";

// pop-up targets drilled into coins
export default {
  label: "Target Practice",
  style: "gunfire",
  reward: "cash",
  chance: 0.01,
  values: {
    targetsMs: [220, 110] as [number, number], // between targets, quickening
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
