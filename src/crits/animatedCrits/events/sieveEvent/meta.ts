import type { EventMeta } from "../../eventMeta";

// a cursor sieves a grid of dots down to its primes, which fire cash
export default {
  label: "Sieve",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    hopsMs: [70, 30] as [number, number], // each hop, quickening
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
