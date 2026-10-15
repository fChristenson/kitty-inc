import type { EventMeta } from "../../eventMeta";

// a gunslinger whips round firing at each worker
export default {
  label: "Quickdraw",
  style: "gunfire",
  reward: "worker perma tiers",
  chance: 0.01,
  values: {
    firstMs: 260,
    drawsMs: [260, 120] as [number, number], // between shots, quickening
    fanGapMs: 180,
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
