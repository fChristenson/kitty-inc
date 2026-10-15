import type { EventMeta } from "../../eventMeta";

// the screen riffled like a deck
export default {
  label: "Shuffle",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    cutMs: 180, // the halves pulling apart
    rifflesMs: [600, 420] as [number, number], // each riffle, quicker
    squareMs: 160, // the deck squaring back up
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
