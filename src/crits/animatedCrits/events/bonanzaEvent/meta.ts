import type { EventMeta } from "../../eventMeta";

// a drill grinds down through a heap of cash, coins geysering out, then it
// surges into the total
export default {
  label: "Bonanza",
  style: "drill",
  reward: "cash",
  chance: 0.01,
  values: {
    pileMs: 380, // the heap pouring down
    approachMs: 220, // the drill's dive onto the peak
    stallMs: 450, // stalled grinding on the bite
    boreMs: 1200, // boring down shove by shove
    drainMs: 300, // the heap lifting off
    liftMs: 320, // each coin's flight into the total
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
