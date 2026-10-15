import type { EventMeta } from "../../eventMeta";

// a wisp surfs a wave of cash
export default {
  label: "Surf",
  style: "mix",
  reward: "cash",
  chance: 0.01,
  values: {
    rollMs: 1_500, // the wave rolling across
    drainMs: 300, // the wave breaking into the total
    flightMs: 420, // each coin's flight into the total
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
