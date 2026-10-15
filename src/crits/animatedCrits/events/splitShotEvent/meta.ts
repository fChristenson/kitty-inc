import type { EventMeta } from "../../eventMeta";

// a ricochet that splits in two at every bounce
export default {
  label: "Split Shot",
  style: "gunfire",
  reward: "cash",
  chance: 0.01,
  values: {
    speeds: [2.2, 4] as [number, number], // px/ms, first to last generation
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
