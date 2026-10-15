import type { EventMeta } from "../../eventMeta";

// two guns weave a lattice of bullets across each worker
export default {
  label: "Bullet Weave",
  style: "gunfire",
  reward: "worker perma tiers",
  chance: 0.01,
  values: {
    weavesMs: [440, 260] as [number, number], // each weave, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
