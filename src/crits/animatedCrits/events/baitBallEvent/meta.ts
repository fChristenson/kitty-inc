import type { EventMeta } from "../../eventMeta";

// wisp hunters slash through a milling shoal of cash
export default {
  label: "Bait Ball",
  style: "mix",
  reward: "cash",
  chance: 0.01,
  values: {
    formMs: 450, // the shoal balling up mid-screen
    slashesMs: [700, 1_000, 1_220], // each hunter crossing its middle
    dashMs: 260, // each hunter's dash across the screen
    flightMs: 380, // each coin's flight into the total
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
