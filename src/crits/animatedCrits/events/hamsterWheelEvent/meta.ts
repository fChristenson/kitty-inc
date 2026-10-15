import type { EventMeta } from "../../eventMeta";

// a wheel of wisps spins up and bursts into the total
export default {
  label: "Hamster Wheel",
  style: "wisp",
  reward: "cash",
  chance: 0.01,
  values: {
    spinMs: 1_200, // the wheel spinning up
    flyMs: 300, // each rim wisp's flight to the total
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
