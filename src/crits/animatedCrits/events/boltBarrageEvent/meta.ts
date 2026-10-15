import type { EventMeta } from "../../eventMeta";

// a barrage of bolts
export default {
  label: "Bolt Barrage",
  style: "lightning",
  reward: "cash",
  chance: 0.01,
  values: {
    barrageMs: 1400, // the barrage
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
