import type { EventMeta } from "../../eventMeta";

// a swinging pair, then chains
export default {
  label: "Cherry Bomb",
  style: "explosion",
  reward: "cash",
  chance: 0.01,
  values: {
    swingMs: 900, // the pendulum, wider and faster
    flightMs: 340, // the flight to the corners
    chainMs: 65, // between bombs along the chain
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
