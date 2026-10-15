import type { EventMeta } from "../../eventMeta";

// chains up stems into clusters on the workers
export default {
  label: "Bomb Bouquet",
  style: "explosion",
  reward: "worker tiers",
  chance: 0.01,
  values: {
    linksMs: 80, // between blasts up a stem
    stemsMs: [300, 180] as [number, number], // between stems, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
