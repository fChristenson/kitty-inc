import type { EventMeta } from "../../eventMeta";

// glitter rains into a giant coin mould over the clicked bar, which flips
// down onto it
export default {
  label: "Mint",
  style: "drawing",
  reward: "a crit tier",
  chance: 0.01,
  values: {
    pourMs: 1200, // every tile landing, bottom row first, quickening
    fallMs: 250, // each drop's fall
    blazeMs: 250, // the finished coin blazing
    dropMs: 350, // the coin flipping down onto the bar
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
