import type { EventMeta } from "../../eventMeta";

// a bird of lightning thunderclaps across the screen
export default {
  label: "Thunderbird",
  style: "lightning",
  reward: "cash",
  chance: 0.01,
  values: {
    flightMs: 1_700, // swooping about
    diveMs: 300, // the final dive
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
