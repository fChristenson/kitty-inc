import type { EventMeta } from "../../eventMeta";

// balls bounce floor to ceiling as gravity flips, then drop onto the empty
// spots
export default {
  label: "Topsy-Turvy",
  style: "bounce",
  reward: "free hires",
  chance: 0.01,
  values: {
    launchMs: 320, // each ball's hop out of the button
    staggerMs: 60, // between balls
    firstHopsMs: 200, // hopping along the floor before the first flip
    fallMs: [260, 180] as [number, number], // each fall to the far side, quickening
    hopsMs: [240, 160] as [number, number], // the hops after each fall, quickening
    dropMs: 300, // the last drop the whole way down onto a spot
    holdMs: 400,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
