import type { EventMeta } from "../../eventMeta";

// dice of wisp pips roll, then every pip lands on a bar
export default {
  label: "Dice Roll",
  style: "experiment",
  reward: "levels",
  chance: 0.01,
  values: {
    rollMs: 900, // the tumble
    restMs: 200, // showing the roll
    pipsMs: 700, // the pips flying off, quickening
    flyMs: 300, // each pip's flight
    levelShare: 0.02, // of the bar's levels, per pip
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
