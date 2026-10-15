import type { EventMeta } from "../../eventMeta";

// a ring of bullets per worker
export default {
  label: "Bullet Cage",
  style: "gunfire",
  reward: "worker tiers",
  chance: 0.01,
  values: {
    cagesMs: [540, 380] as [number, number], // each cage, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
