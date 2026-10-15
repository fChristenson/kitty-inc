import type { EventMeta } from "../../eventMeta";

// a runner clears a hurdle on every bar
export default {
  label: "Hurdles",
  style: "experiment",
  reward: "levels",
  chance: 0.01,
  values: {
    runsMs: [520, 360] as [number, number], // each run along a bar, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
