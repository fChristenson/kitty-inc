import type { EventMeta } from "../../eventMeta";

// a jet of cash pours down through a triangle of pegs into a bell curve of
// heaps, which surge into the total
export default {
  label: "Galton Board",
  style: "money",
  reward: "cash",
  chance: 0.01,
  values: {
    growMs: 250, // the pegs popping up
    riseMs: 260, // each coin's trip up the jet to the top peg
    pegMs: 50, // each bounce down a row of pegs
    streamMs: 600, // how long the jet pours
    fallMs: 180, // each coin's drop onto its heap
    surgeMs: 400, // the heaps lifting off, one after another
    liftMs: 300, // each coin's flight up into the total
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
