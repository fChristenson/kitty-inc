import type { EventMeta } from "../../eventMeta";

// a keeper wisp plays a Sokoban puzzle, shoving heaps of cash onto targets
export default {
  label: "Sokoban",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    dropMs: 350, // the heaps dropping in
    stepMs: [95, 50] as [number, number], // each of the keeper's 23 steps, quickening
    burstMs: 250, // the targets blazing before the heaps burst
    riseMs: 400, // each coin's rise into the total
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
