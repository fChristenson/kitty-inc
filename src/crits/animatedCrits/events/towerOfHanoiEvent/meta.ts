import type { EventMeta } from "../../eventMeta";

// bars of light solve the Tower of Hanoi on three pegs on the clicked bar,
// then hammer it a crit tier
export default {
  label: "Tower of Hanoi",
  style: "experiment",
  reward: "a crit tier",
  chance: 0.01,
  values: {
    growMs: 300, // the pegs shooting up and the stack dropping on
    solveMs: 1600, // all 31 moves, quickening
    hammerMs: 200, // the finished tower hammering down
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
