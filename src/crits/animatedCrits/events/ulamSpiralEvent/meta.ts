import type { EventMeta } from "../../eventMeta";

// a counter winds out a square spiral, the primes flaring, then flying onto
// the workers
export default {
  label: "Ulam Spiral",
  style: "experiment",
  reward: "worker perma tiers",
  chance: 0.01,
  values: {
    stepMs: [14, 6] as [number, number], // each count, quickening
    flyMs: 340, // each prime's flight onto its worker
    holdMs: 400,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
