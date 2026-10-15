import type { EventMeta } from "../../eventMeta";

// the screen flips to gold in tiles
export default {
  label: "Tile Flip",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    waveMs: 700, // the flip wave racing out
    flipMs: 220, // each tile flipping
    showMs: 250, // the screen all gold
    backMs: 200, // every tile flipping back
    holdMs: 300,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
