import type { EventMeta } from "../../eventMeta";

// a wheel of lightning spokes strikes empty spots
export default {
  label: "Bolt Wheel",
  style: "lightning",
  reward: "hires",
  chance: 0.01,
  values: {
    flyMs: 300, // the hub flying in
    spinMs: 1_700, // the wheel turning, ever faster
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
