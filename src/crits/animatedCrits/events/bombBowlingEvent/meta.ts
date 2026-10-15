import type { EventMeta } from "../../eventMeta";

// a bomb bowls into a rack of bomb pins
export default {
  label: "Bomb Bowling",
  style: "explosion",
  reward: "cash",
  chance: 0.01,
  values: {
    rollMs: 650, // the ball rolling in
    chainMs: 650, // the strike tearing through the rack to the ball's blast
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
