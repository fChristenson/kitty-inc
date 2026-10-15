import type { EventMeta } from "../../eventMeta";

// the screen as a bed of pins pushed out from behind
export default {
  label: "Pin Art",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    traceMs: 1500,
    waveMs: 420,
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
