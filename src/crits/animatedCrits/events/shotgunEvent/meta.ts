import type { EventMeta } from "../../eventMeta";

// a pump shotgun blasts the workers
export default {
  label: "Shotgun",
  style: "gunfire",
  reward: "worker tiers",
  chance: 0.01,
  values: {
    moveMs: 220, // moving up beside a worker
    pumpMs: [260, 140] as [number, number], // each pump, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
