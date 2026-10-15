import type { EventMeta } from "../../eventMeta";

// two swells meet in a sea of cash and rear up into a rogue wave
export default {
  label: "Rogue Wave",
  style: "money",
  reward: "levels + cash",
  chance: 0.01,
  values: {
    floodMs: 400, // the sea rising
    swellMs: 700, // the swells rolling in to meet
    spoutMs: 500, // the peak shooting up the screen
    leapMs: 360, // each coin's leap into the total
    levelShare: 0.04,
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
