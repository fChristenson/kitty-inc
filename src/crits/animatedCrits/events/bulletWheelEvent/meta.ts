import type { EventMeta } from "../../eventMeta";

// a rolling wheel of guns
export default {
  label: "Bullet Wheel",
  style: "gunfire",
  reward: "cash",
  chance: 0.01,
  values: {
    spinMs: 1500, // the wheel's roll across
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
