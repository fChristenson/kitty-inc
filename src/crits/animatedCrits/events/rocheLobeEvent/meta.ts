import type { EventMeta } from "../../eventMeta";

// a small hot wisp peels a stream of glitter off a big star into a disk,
// which blows in a nova of coins
export default {
  label: "Roche Lobe",
  style: "galaxy",
  reward: "cash",
  chance: 0.01,
  values: {
    growMs: 250, // the stars swirling up
    feedMs: 1100, // the stream peeling off
    flowMs: 350, // each grain's arc across
    liftMs: 400, // the nova's coins flying into the total
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
