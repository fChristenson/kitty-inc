import type { EventMeta } from "../../eventMeta";

// beam jaws clamp onto each bar
export default {
  label: "Beam Vise",
  style: "beam",
  reward: "crit tiers",
  chance: 0.01,
  values: {
    gripsMs: [560, 320] as [number, number], // each grip, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
