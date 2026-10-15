import type { EventMeta } from "../../eventMeta";

// a nozzle darts worker to worker blasting each in a recoiling burst of mist
export default {
  label: "Extinguisher",
  style: "spray",
  reward: "worker perma tiers",
  chance: 0.01,
  values: {
    dartMs: [260, 160] as [number, number], // each dart to a firing spot, quickening
    blastMs: [320, 220] as [number, number], // each blast, quickening
    lastBlastMs: 520, // the last, long double blast
    holdMs: 400,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
