import type { EventMeta } from "../../eventMeta";

// a bolt breaks into beads that zip to the workers
export default {
  label: "Bead Lightning",
  style: "lightning",
  reward: "worker perma tiers",
  chance: 0.01,
  values: {
    beadsAtMs: 380, // the first bead peeling off
    peelsMs: [200, 90] as [number, number], // between beads, quickening
    zipMs: 280,
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
