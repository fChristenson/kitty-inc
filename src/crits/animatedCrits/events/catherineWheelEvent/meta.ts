import type { EventMeta } from "../../eventMeta";

// the button spins like a firework wheel, spraying four jets of cash into
// spiral arms
export default {
  label: "Catherine Wheel",
  style: "money",
  reward: "cash",
  chance: 0.01,
  values: {
    spinMs: 1_400, // spraying, ever faster
    spinRate: [0.004, 0.02] as [number, number], // rad per ms, speeding up
    outMs: 520, // each coin flying out along its arm
    flightMs: 380, // each coin's flight on into the total
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
