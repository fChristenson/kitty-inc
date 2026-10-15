import type { EventMeta } from "../../eventMeta";

// stick wisps race down a winding river of cash, each leaping out onto an
// empty spot
export default {
  label: "Poohsticks",
  style: "mix",
  reward: "free hires and cash",
  chance: 0.01,
  values: {
    travelMs: 900, // each coin's trip down the river
    streamMs: 1300, // how long the river pours
    dropMs: 250, // the first stick plopping in
    raceMs: 1300, // a stick's trip down the river at its average speed
    leapMs: 320, // each stick's leap onto its spot
    holdMs: 300,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
