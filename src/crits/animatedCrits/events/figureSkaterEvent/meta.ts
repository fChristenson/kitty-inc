import type { EventMeta } from "../../eventMeta";

// a skater wisp carves cash across the screen
export default {
  label: "Figure Skater",
  style: "mix",
  reward: "a crit tier + cash",
  chance: 0.01,
  values: {
    enterMs: 300, // gliding in
    skateMs: 900, // the routine
    jumpMs: 350, // the final jump
    flightMs: 400, // each coin's flight into the total
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
