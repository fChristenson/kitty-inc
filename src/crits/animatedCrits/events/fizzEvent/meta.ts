import type { EventMeta } from "../../eventMeta";

// cash fizzes up like soda
export default {
  label: "Fizz",
  style: "money",
  reward: "hires + cash",
  chance: 0.01,
  values: {
    fizzMs: 1_400, // the fizz rising
    bubblesMs: 900, // between the first and last bubble popping
    flightMs: 400, // each coin's flight into the total
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
