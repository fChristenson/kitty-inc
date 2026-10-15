import type { EventMeta } from "../../eventMeta";

// a second hand ticks round twice to midnight
export default {
  label: "Clockwork",
  chance: 0.01,
  values: {
    tickMs: [160, 35] as [number, number], // between ticks, quickening
    holdMs: 450,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
