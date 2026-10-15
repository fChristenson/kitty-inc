import type { EventMeta } from "../../eventMeta";

// glitter torn off every bar flies up in waves into a giant crown mid-screen,
// quicker and quicker; it blazes, then drops onto the locked floor and bursts
// it open
export default {
  label: "Coronation",
  style: "drawing",
  reward: "free floors",
  chance: 0.01,
  values: {
    firstMs: 260, // from the click till the first wave flies
    gapsMs: [360, 110] as [number, number], // between the waves, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
