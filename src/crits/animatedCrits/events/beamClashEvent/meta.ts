import type { EventMeta } from "../../eventMeta";

// two beams clash, then a geyser of cash
export default {
  label: "Beam Clash",
  style: "beam",
  chance: 0.01,
  values: {
    aimMs: 250, // the aim lasers flickering
    fireMs: 150, // the beams firing in to meet
    clashMs: 1_000, // the clash shoving back and forth
    overloadMs: 200, // overloading before they blow
    streamMs: 400, // the geyser pouring
    travelMs: 450, // each coin's trip up it
    holdMs: 300,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
