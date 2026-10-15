import type { EventMeta } from "../../eventMeta";

// three ever bigger drills bore the same spot on the clicked bar one after
// another
export default {
  label: "Pilot Hole",
  style: "drill",
  reward: "levels",
  chance: 0.01,
  values: {
    approachMs: 220, // each bit dropping onto the spot
    stallMs: 650, // the biggest bit's stall (the smaller ones' are shorter)
    boreMs: 900, // the biggest bit's bore (the smaller ones' are shorter)
    levelShare: 0.012, // the smallest bit's levels; bigger bits give 2x and 4x
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
