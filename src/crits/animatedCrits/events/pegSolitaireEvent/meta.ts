import type { EventMeta } from "../../eventMeta";

// pegs jump each other and pop into coins
export default {
  label: "Peg Solitaire",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    setMs: 400, // the board setting up
    jumpsMs: [260, 140] as [number, number], // between jumps, quickening
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
