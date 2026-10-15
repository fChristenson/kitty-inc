import type { EventMeta } from "../../eventMeta";

// shells burst into lightning stars over the workers
export default {
  label: "Thunder Shell",
  style: "lightning",
  reward: "worker perma tiers",
  chance: 0.01,
  values: {
    shellsMs: [420, 260] as [number, number], // between shells, quickening
    riseMs: 320,
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
