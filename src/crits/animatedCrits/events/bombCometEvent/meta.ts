import type { EventMeta } from "../../eventMeta";

// a comet with a tail of bombs slams the lock
export default {
  label: "Bomb Comet",
  style: "explosion",
  reward: "a free floor",
  chance: 0.01,
  values: {
    flightMs: 700,
    lagMs: [160, 70] as [number, number], // between the tail's bombs, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
